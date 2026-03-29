import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import * as THREE from "three";
import * as GLTF from "three/examples/jsm/loaders/GLTFLoader";
import * as VRMUtils from "@pixiv/three-vrm";
import * as Kalidokit from "kalidokit";
import { useMainStore } from '../main/main';
import { useAccountStore } from '../land/account';
import { buildBackendWsUrl, buildFrontendUrl } from '@/config/runtime'
import { Track, createLocalVideoTrack } from 'livekit-client'

import sr from '@/api/spring-rest'
import axios from 'axios'


let currentVrm;
let tasksVisionFilesetPromise;
let tasksVisionModulePromise;
let trackingPreviewElementsCache = null;
let holisticWorkerInstance = null;
let holisticWorkerRequestSeq = 0;
let holisticWorkerPendingRequests = new Map();
const PUBLIC_BASE_URL = (process.env.BASE_URL || "/").replace(/\/+$/, "");
const buildPublicAssetUrl = (assetPath) =>
  `${PUBLIC_BASE_URL}/${assetPath}`.replace(/\/{2,}/g, "/");

const TASKS_VISION_WASM_URL = buildPublicAssetUrl("mediapipe/wasm");
const TASKS_VISION_MODULE_URL = buildPublicAssetUrl("mediapipe/vision_bundle.mjs");
const HOLISTIC_LANDMARKER_MODEL_URL = buildPublicAssetUrl(
  "mediapipe/models/holistic_landmarker.task"
);
const CHAT_RENDER_PIXEL_RATIO = 1;
const CHAT_RENDER_FPS = 60;
const CHAT_CAPTURE_FPS = 24;
const CHAT_MOTION_PROCESS_FPS = 24;
const CHAT_DESKTOP_CAMERA_SIZE = { width: 640, height: 480 };
const CHAT_MOBILE_CAMERA_SIZE = { width: 480, height: 360 };
const CHAT_DESKTOP_AVATAR_SIZE = { width: 960, height: 720 };
const CHAT_MOBILE_AVATAR_SIZE = { width: 720, height: 540 };
const CHAT_MOTION_MIN_CONFIDENCE = 0.45;

const isAppleTouchDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const isCompactViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 900px)").matches;

const getTrackingCameraSize = () =>
  isAppleTouchDevice() || isCompactViewport()
    ? CHAT_MOBILE_CAMERA_SIZE
    : CHAT_DESKTOP_CAMERA_SIZE;

const getChatAvatarRenderSize = () =>
  isAppleTouchDevice() || isCompactViewport()
    ? CHAT_MOBILE_AVATAR_SIZE
    : CHAT_DESKTOP_AVATAR_SIZE;

const getChatRenderPixelRatio = () =>
  isAppleTouchDevice() ? 0.9 : CHAT_RENDER_PIXEL_RATIO;

const HOLISTIC_PROCESSING_PROFILE = Object.freeze({
  OFF: "off",
  MAIN_CPU: "main-cpu",
  WORKER_CPU: "worker-cpu",
  WORKER_GPU: "worker-gpu",
});

const supportsHolisticMainThreadRuntime = () =>
  typeof window !== "undefined" &&
  typeof document !== "undefined";

const supportsHolisticWorkerRuntime = () =>
  typeof Worker !== "undefined" &&
  typeof createImageBitmap === "function";

const supportsHolisticWorkerGpuRuntime = () => {
  if (!supportsHolisticWorkerRuntime() || typeof OffscreenCanvas === "undefined") {
    return false;
  }

  try {
    const canvas = new OffscreenCanvas(1, 1);
    return Boolean(canvas.getContext("webgl2"));
  } catch (error) {
    return false;
  }
};

const isHolisticWorkerProfile = (profile) => {
  const normalizedProfile = normalizeHolisticProcessingProfile(profile);

  return (
    normalizedProfile === HOLISTIC_PROCESSING_PROFILE.WORKER_CPU ||
    normalizedProfile === HOLISTIC_PROCESSING_PROFILE.WORKER_GPU
  );
};

const isHolisticMainThreadProfile = (profile) =>
  normalizeHolisticProcessingProfile(profile) ===
  HOLISTIC_PROCESSING_PROFILE.MAIN_CPU;

const supportsHolisticProcessingProfile = (profile) => {
  const normalizedProfile = normalizeHolisticProcessingProfile(profile);

  switch (normalizedProfile) {
    case HOLISTIC_PROCESSING_PROFILE.OFF:
      return true;
    case HOLISTIC_PROCESSING_PROFILE.MAIN_CPU:
      return supportsHolisticMainThreadRuntime();
    case HOLISTIC_PROCESSING_PROFILE.WORKER_GPU:
      return supportsHolisticWorkerGpuRuntime();
    case HOLISTIC_PROCESSING_PROFILE.WORKER_CPU:
    default:
      return supportsHolisticWorkerRuntime();
  }
};

const normalizeHolisticProcessingProfile = (profile) => {
  switch (profile) {
    case HOLISTIC_PROCESSING_PROFILE.OFF:
      return HOLISTIC_PROCESSING_PROFILE.OFF;
    case HOLISTIC_PROCESSING_PROFILE.MAIN_CPU:
      return HOLISTIC_PROCESSING_PROFILE.MAIN_CPU;
    case HOLISTIC_PROCESSING_PROFILE.WORKER_GPU:
      return HOLISTIC_PROCESSING_PROFILE.WORKER_GPU;
    case HOLISTIC_PROCESSING_PROFILE.WORKER_CPU:
    default:
      return HOLISTIC_PROCESSING_PROFILE.WORKER_CPU;
  }
};

const getDefaultHolisticProcessingProfile = () => {
  if (isAppleTouchDevice() && supportsHolisticMainThreadRuntime()) {
    return HOLISTIC_PROCESSING_PROFILE.MAIN_CPU;
  }

  if (supportsHolisticWorkerRuntime()) {
    return HOLISTIC_PROCESSING_PROFILE.WORKER_CPU;
  }

  if (supportsHolisticMainThreadRuntime()) {
    return HOLISTIC_PROCESSING_PROFILE.MAIN_CPU;
  }

  return HOLISTIC_PROCESSING_PROFILE.OFF;
};

const formatHolisticProcessingModeLabel = (profile) => {
  switch (normalizeHolisticProcessingProfile(profile)) {
    case HOLISTIC_PROCESSING_PROFILE.OFF:
      return "모션 꺼짐";
    case HOLISTIC_PROCESSING_PROFILE.MAIN_CPU:
      return "브라우저 + CPU";
    case HOLISTIC_PROCESSING_PROFILE.WORKER_GPU:
      return "워커 + GPU";
    case HOLISTIC_PROCESSING_PROFILE.WORKER_CPU:
    default:
      return "워커 + CPU";
  }
};

const getHolisticActiveStatusForProfile = (profile) =>
  isHolisticMainThreadProfile(profile)
    ? "main-cpu-active"
    : normalizeHolisticProcessingProfile(profile) ===
      HOLISTIC_PROCESSING_PROFILE.WORKER_GPU
    ? "worker-gpu-active"
    : "worker-cpu-active";

const getHolisticFailureStatusForProfile = (profile) =>
  isHolisticMainThreadProfile(profile)
    ? "main-cpu-failed"
    : normalizeHolisticProcessingProfile(profile) ===
      HOLISTIC_PROCESSING_PROFILE.WORKER_GPU
    ? "worker-gpu-failed"
    : "worker-cpu-failed";

const getHolisticDelegateForProfile = (profile) =>
  normalizeHolisticProcessingProfile(profile) ===
  HOLISTIC_PROCESSING_PROFILE.WORKER_GPU
    ? "GPU"
    : "CPU";

const loadTasksVisionModule = async () => {
  if (!tasksVisionModulePromise) {
    tasksVisionModulePromise = import(
      /* webpackIgnore: true */ TASKS_VISION_MODULE_URL
    );
  }

  return tasksVisionModulePromise;
};

const getHolisticProcessingModeLabel = ({
  status = "",
  requestedProfile = getDefaultHolisticProcessingProfile(),
  motionEnabled = true,
  switching = false,
} = {}) => {
  const normalizedProfile =
    normalizeHolisticProcessingProfile(requestedProfile);

  if (switching) {
    return `${formatHolisticProcessingModeLabel(normalizedProfile)} - 설정 중`;
  }

  switch (status) {
    case "motion-off":
      return formatHolisticProcessingModeLabel(
        HOLISTIC_PROCESSING_PROFILE.OFF
      );
    case "worker-unavailable":
      return "워커 불가";
    case "main-cpu-active":
      return formatHolisticProcessingModeLabel(
        HOLISTIC_PROCESSING_PROFILE.MAIN_CPU
      );
    case "worker-cpu-active":
      return formatHolisticProcessingModeLabel(
        HOLISTIC_PROCESSING_PROFILE.WORKER_CPU
      );
    case "worker-gpu-active":
      return formatHolisticProcessingModeLabel(
        HOLISTIC_PROCESSING_PROFILE.WORKER_GPU
      );
    case "worker-cpu-failed":
      return `${formatHolisticProcessingModeLabel(
        HOLISTIC_PROCESSING_PROFILE.WORKER_CPU
      )} - 실패`;
    case "worker-gpu-failed":
      return `${formatHolisticProcessingModeLabel(
        HOLISTIC_PROCESSING_PROFILE.WORKER_GPU
      )} - 실패`;
    case "main-cpu-failed":
      return `${formatHolisticProcessingModeLabel(
        HOLISTIC_PROCESSING_PROFILE.MAIN_CPU
      )} - 실패`;
    default:
      if (!motionEnabled || normalizedProfile === HOLISTIC_PROCESSING_PROFILE.OFF) {
        return formatHolisticProcessingModeLabel(
          HOLISTIC_PROCESSING_PROFILE.OFF
        );
      }

      if (!supportsHolisticProcessingProfile(normalizedProfile)) {
        if (isHolisticWorkerProfile(normalizedProfile)) {
          return "워커 불가";
        }

        return "브라우저 불가";
      }

      return formatHolisticProcessingModeLabel(normalizedProfile);
  }
};

export const useChatStore = defineStore('chat', {
  state: () => ({
    accuseBtn: 0,
    gameBtn: 0,
    loading: 1,
    loadingText: "로딩중",
    loadingProgress: 0,
    motionFaceCount: 0,
    motionPoseCount: 0,
    lastMotionStatusSyncAt: 0,
    webSocket: null,
    room: undefined,
    participantToken: '',
    roomServerUrl: '',
    localVideoTrack: null,
    localAudioTrack: null,
    camera: null,
    holistic: null,
    holisticDelegate: '',
    holisticDelegateStatus: '',
    motionRequestedProfile: getDefaultHolisticProcessingProfile(),
    motionAppliedProfile: '',
    motionSettingsOpen: false,
    motionProfileSwitching: false,
    holisticEmptyFaceFrames: 0,
    holisticFrameInFlight: false,
    lastHolisticVideoTime: -1,
    holisticTrackingLogged: false,
    avatarRenderer: null,
    avatarScene: null,
    avatarOrbitControls: null,
    avatarAnimationFrameId: null,
    SessionName: "SessionA",
    otherPeople: [],
    motionCheck:
      getDefaultHolisticProcessingProfile() !== HOLISTIC_PROCESSING_PROFILE.OFF,
    time: "채팅시작!",
    gameQ : "질문",
    gameA1 : "답1",
    gameA2 : "답2",
    ready: false,
    heartRainFlag: false,
    leavingSession: false,
    soloMode: false,
    liveKitQuotaModal: false,
    chatMessages: [],
    trackingDebugPreviewEnabled: true,
    debugLoggingEnabled: false,
    debugMessages: [],
  }),
  getters: {
    motionProcessingModeLabel(state) {
      return getHolisticProcessingModeLabel({
        status: state.holisticDelegateStatus,
        requestedProfile: state.motionRequestedProfile,
        motionEnabled: state.motionCheck,
        switching: state.motionProfileSwitching,
      });
    },
  },
  actions: {
    logDebug(stage, details = {}) {
      if (!this.debugLoggingEnabled) {
        return;
      }

      const entry = {
        at: new Date().toISOString(),
        stage,
        details,
      };

      this.debugMessages.push(entry);
      if (this.debugMessages.length > 200) {
        this.debugMessages.shift();
      }

      if (typeof window !== "undefined") {
        window.__UKM_CHAT_DEBUG__ = this.debugMessages;
      }

      console.log("[UKM-CHAT]", stage, details);
    },
    invalidateTrackingPreviewElements() {
      trackingPreviewElementsCache = null;
    },
    async waitForDomElement(selector, options = {}) {
      const {
        by = "query",
        timeoutMs = 2000,
        intervalMs = 16,
      } = options;

      const findElement = () =>
        by === "id"
          ? document.getElementById(selector)
          : document.querySelector(selector);

      const startedAt = Date.now();
      let element = findElement();

      while (!element && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        element = findElement();
      }

      if (!element) {
        const target = by === "id" ? `id="${selector}"` : `selector "${selector}"`;
        throw new Error(`필수 DOM 요소(${target})를 찾을 수 없습니다.`);
      }

      return element;
    },
    findAvatarCanvasElement() {
      const matchingRoom = String(useMainStore().option.matchingRoom || "");
      const candidateIds = [
        `avatarCanvas${matchingRoom}`,
        "avatarCanvas1",
        "avatarCanvas2",
      ];

      for (const canvasId of candidateIds) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
          return canvas;
        }
      }

      return document.querySelector('#my-video canvas[id^="avatarCanvas"]');
    },
    async waitForAvatarCanvas(timeoutMs = 3000, intervalMs = 16) {
      const startedAt = Date.now();
      let avatarCanvas = this.findAvatarCanvasElement();

      while (!avatarCanvas && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        avatarCanvas = this.findAvatarCanvasElement();
      }

      if (!avatarCanvas) {
        throw new Error("아바타 캔버스를 찾을 수 없습니다.");
      }

      return avatarCanvas;
    },
    setLoadingState(progress, text) {
      this.loadingProgress = Math.max(0, Math.min(100, Math.round(progress)));

      if (text) {
        this.loadingText = text;
      }
    },
    resetSessionUiState() {
      this.otherPeople = [];
      this.heartRainFlag = false;
      this.ready = false;
      this.accuseBtn = 0;
      this.gameBtn = 0;
      this.loadingProgress = 0;
      this.chatMessages = [];
      this.debugMessages = [];
      this.motionFaceCount = 0;
      this.motionPoseCount = 0;
      this.lastMotionStatusSyncAt = 0;
      this.holisticTrackingLogged = false;
      this.motionRequestedProfile = getDefaultHolisticProcessingProfile();
      this.motionAppliedProfile = "";
      this.motionSettingsOpen = false;
      this.motionProfileSwitching = false;
      this.motionCheck =
        this.motionRequestedProfile !== HOLISTIC_PROCESSING_PROFILE.OFF;
      this.refreshTrackingDebugPreviewFlag();
      this.refreshDebugLoggingFlag();
      this.invalidateTrackingPreviewElements();

      if (typeof window !== "undefined") {
        window.__UKM_CHAT_DEBUG__ = [];
      }
    },
    refreshTrackingDebugPreviewFlag() {
      this.trackingDebugPreviewEnabled = true;

      return this.trackingDebugPreviewEnabled;
    },
    refreshDebugLoggingFlag() {
      this.debugLoggingEnabled =
        typeof window !== "undefined" &&
        window.localStorage.getItem("ukm-chat-debug-log") === "1";

      return this.debugLoggingEnabled;
    },
    syncMotionStatus(faceCount, poseCount, force = false) {
      const nextFaceCount = faceCount || 0;
      const nextPoseCount = poseCount || 0;
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const trackingPresenceChanged =
        (this.motionFaceCount > 0) !== (nextFaceCount > 0) ||
        (this.motionPoseCount > 0) !== (nextPoseCount > 0);
      const countsChanged =
        this.motionFaceCount !== nextFaceCount ||
        this.motionPoseCount !== nextPoseCount;

      if (
        !force &&
        !trackingPresenceChanged &&
        (!countsChanged || now - this.lastMotionStatusSyncAt < 250)
      ) {
        return;
      }

      this.motionFaceCount = nextFaceCount;
      this.motionPoseCount = nextPoseCount;
      this.lastMotionStatusSyncAt = now;
    },

    getTime() {
      let today = new Date();

      this.time = today.toLocaleTimeString('en-US', { hour12: false });
    },
    cleanupAvatarPipeline(options = {}) {
      const {
        stopCamera = true,
        closeHolistic = true,
      } = options;

      if (this.avatarAnimationFrameId) {
        cancelAnimationFrame(this.avatarAnimationFrameId);
        this.avatarAnimationFrameId = null;
      }

      if (this.avatarOrbitControls) {
        this.avatarOrbitControls.dispose();
        this.avatarOrbitControls = null;
      }

      if (currentVrm?.scene?.parent) {
        currentVrm.scene.parent.remove(currentVrm.scene);
      }
      currentVrm = null;

      if (this.avatarRenderer) {
        this.avatarRenderer.dispose();
        if (typeof this.avatarRenderer.forceContextLoss === "function") {
          this.avatarRenderer.forceContextLoss();
        }

        const canvas = this.avatarRenderer.domElement;
        if (canvas?.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        this.avatarRenderer = null;
      }

      if (closeHolistic && this.holistic) {
        try {
          this.holistic.close();
        } catch (error) {
          console.warn("Holistic 종료 중 오류가 발생했습니다.", error);
        }
        this.holistic = null;
      }
      if (closeHolistic) {
        this.destroyHolisticWorker("cleanup");
      }
      this.holisticDelegate = '';
      this.holisticDelegateStatus = '';
      this.motionAppliedProfile = '';
      this.motionSettingsOpen = false;
      this.motionProfileSwitching = false;
      this.holisticEmptyFaceFrames = 0;
      this.holisticFrameInFlight = false;
      this.lastHolisticVideoTime = -1;
      this.holisticTrackingLogged = false;
      this.motionFaceCount = 0;
      this.motionPoseCount = 0;

      if (stopCamera && this.camera) {
        try {
          this.camera.stop();
        } catch (error) {
          console.warn("카메라 종료 중 오류가 발생했습니다.", error);
        }
        this.camera = null;
      }

      const testVideo = document.getElementById("test-video");
      if (testVideo?.srcObject) {
        const tracks = testVideo.srcObject.getTracks?.() || [];
        tracks.forEach((track) => track.stop());
        testVideo.srcObject = null;
      }

      const {
        primaryCanvas,
        debugCanvas,
        debugVideo,
      } = this.getTrackingPreviewElements();

      for (const canvasElement of [primaryCanvas, debugCanvas]) {
        if (!canvasElement) {
          continue;
        }

        const canvasCtx = canvasElement.getContext("2d");
        canvasCtx?.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }

      if (debugVideo?.srcObject) {
        debugVideo.srcObject = null;
      }

      this.avatarScene = null;
      this.ready = false;
      this.invalidateTrackingPreviewElements();
    },
    createTrackingCamera(videoElement, frameHandler) {
      let mediaStream = null;
      let animationFrameId = null;
      let active = false;
      let lastHandledAt = 0;
      let lastPreviewVideoWidth = 0;
      let lastPreviewVideoHeight = 0;
      const minFrameInterval = frameHandler
        ? 1000 / CHAT_MOTION_PROCESS_FPS
        : 0;

      const tick = async (now = performance.now()) => {
        if (!active) {
          return;
        }

        if (typeof document !== "undefined" && document.hidden) {
          animationFrameId = window.requestAnimationFrame(tick);
          return;
        }

        if (
          videoElement?.videoWidth > 0 &&
          videoElement?.videoHeight > 0 &&
          (videoElement.videoWidth !== lastPreviewVideoWidth ||
            videoElement.videoHeight !== lastPreviewVideoHeight)
        ) {
          lastPreviewVideoWidth = videoElement.videoWidth;
          lastPreviewVideoHeight = videoElement.videoHeight;
          this.resetTrackingForInputResize(
            lastPreviewVideoWidth,
            lastPreviewVideoHeight
          );
        }

        if (frameHandler && now - lastHandledAt >= minFrameInterval) {
          lastHandledAt = now;
          await frameHandler();
        }

        animationFrameId = window.requestAnimationFrame(tick);
      };

      return {
        start: async () => {
          active = true;
          this.prepareVideoElement(videoElement);
          const cameraSize = getTrackingCameraSize();
          const preferredVideoConstraints = {
            width: {
              ideal: cameraSize.width,
            },
            height: {
              ideal: cameraSize.height,
            },
            resizeMode: {
              ideal: "none",
            },
            facingMode: "user",
          };
          const fallbackVideoConstraints = {
            width: {
              ideal: cameraSize.width,
            },
            height: {
              ideal: cameraSize.height,
            },
            facingMode: "user",
          };

          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: preferredVideoConstraints,
            });
          } catch (error) {
            this.logDebug("tracking:getUserMediaPreferredFailed", {
              message: error?.message || String(error),
            });
            mediaStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: fallbackVideoConstraints,
            });
          }
          videoElement.srcObject = mediaStream;
          await videoElement.play();
          const trackSettings =
            mediaStream?.getVideoTracks?.()[0]?.getSettings?.() || {};
          this.logDebug("tracking:cameraSettings", {
            width: trackSettings.width || videoElement.videoWidth || null,
            height: trackSettings.height || videoElement.videoHeight || null,
            aspectRatio: trackSettings.aspectRatio || null,
            resizeMode: trackSettings.resizeMode || "unknown",
          });
          animationFrameId = window.requestAnimationFrame(tick);
        },
        stop: () => {
          active = false;
          if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }

          const tracks =
            videoElement?.srcObject?.getTracks?.() ||
            mediaStream?.getTracks?.() ||
            [];
          tracks.forEach((track) => track.stop());
          if (videoElement) {
            videoElement.srcObject = null;
          }
          mediaStream = null;
        },
      };
    },
    createPassiveCamera(videoElement) {
      return this.createTrackingCamera(videoElement, null);
    },
    getTrackingPreviewElements() {
      const cacheIsValid =
        trackingPreviewElementsCache &&
        Object.values(trackingPreviewElementsCache).every(
          (element) => !element || element.isConnected
        );

      if (cacheIsValid) {
        return trackingPreviewElementsCache;
      }

      trackingPreviewElementsCache = {
        primaryPreview: document.querySelector(".tracking-preview-primary"),
        primaryVideo: document.querySelector(".tracking-primary-video"),
        primaryPassiveVideo: document.querySelector(
          ".tracking-primary-video-passive"
        ),
        primaryCanvas: document.querySelector("canvas.tracking-primary-canvas"),
        gpuCanvas: document.querySelector("canvas.tracking-gpu-canvas"),
        debugPreview: document.querySelector(
          ".tracking-preview-debug .tracking-preview"
        ),
        debugVideo: document.querySelector(".tracking-debug-video"),
        debugCanvas: document.querySelector("canvas.tracking-debug-canvas"),
      };

      return trackingPreviewElementsCache;
    },
    prepareVideoElement(videoElement, options = {}) {
      if (!videoElement) {
        return;
      }

      const { muted = true } = options;

      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = muted;
      videoElement.defaultMuted = muted;
      videoElement.setAttribute("autoplay", "");
      videoElement.setAttribute("playsinline", "");
      if (muted) {
        videoElement.setAttribute("muted", "");
      } else {
        videoElement.removeAttribute("muted");
      }
    },
    async waitForVideoReady(videoElement, timeoutMs = 5000) {
      if (!videoElement) {
        throw new Error("비디오 요소가 존재하지 않습니다.");
      }

      if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
        return;
      }

      await new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error("카메라 비디오 준비가 지연되고 있습니다."));
        }, timeoutMs);

        const handleReady = () => {
          if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
            cleanup();
            resolve();
          }
        };

        const cleanup = () => {
          window.clearTimeout(timeoutId);
          videoElement.removeEventListener("loadedmetadata", handleReady);
          videoElement.removeEventListener("loadeddata", handleReady);
          videoElement.removeEventListener("canplay", handleReady);
          videoElement.removeEventListener("playing", handleReady);
        };

        videoElement.addEventListener("loadedmetadata", handleReady);
        videoElement.addEventListener("loadeddata", handleReady);
        videoElement.addEventListener("canplay", handleReady);
        videoElement.addEventListener("playing", handleReady);
        handleReady();
      });
    },
    async syncTrackingDebugStream(sourceVideoElement) {
      const debugEnabled = this.refreshTrackingDebugPreviewFlag();
      const { debugVideo } = this.getTrackingPreviewElements();

      if (!debugEnabled) {
        if (debugVideo?.srcObject) {
          debugVideo.srcObject = null;
        }
        return;
      }

      if (!sourceVideoElement?.srcObject || !debugVideo) {
        return;
      }

      this.prepareVideoElement(debugVideo);
      if (debugVideo.srcObject !== sourceVideoElement.srcObject) {
        debugVideo.srcObject = sourceVideoElement.srcObject;
      }

      try {
        await debugVideo.play();
      } catch (error) {
        console.warn("디버그 프리뷰 재생 요청에 실패했습니다.", error);
      }
    },
    syncTrackingPreviewAspectRatio(videoWidth, videoHeight) {
      if (!videoWidth || !videoHeight) {
        return;
      }

      const aspectRatio = `${videoWidth} / ${videoHeight}`;
      const { primaryPreview, debugPreview } = this.getTrackingPreviewElements();

      if (primaryPreview) {
        if (primaryPreview.style.aspectRatio !== aspectRatio) {
          primaryPreview.style.aspectRatio = aspectRatio;
        }
      }

      if (debugPreview) {
        if (debugPreview.style.aspectRatio !== aspectRatio) {
          debugPreview.style.aspectRatio = aspectRatio;
        }
      }
    },
    resetTrackingForInputResize(videoWidth, videoHeight) {
      if (!videoWidth || !videoHeight) {
        return;
      }

      this.syncTrackingPreviewAspectRatio(videoWidth, videoHeight);
      this.lastHolisticVideoTime = -1;
      this.holisticFrameInFlight = false;
      this.holisticEmptyFaceFrames = 0;
      this.holisticTrackingLogged = false;
      this.syncMotionStatus(0, 0, true);

      const { primaryCanvas, debugCanvas } = this.getTrackingPreviewElements();
      [primaryCanvas, debugCanvas].forEach((canvasElement) => {
        if (!canvasElement) {
          return;
        }

        const canvasCtx = canvasElement.getContext("2d");
        canvasCtx?.clearRect(0, 0, canvasElement.width, canvasElement.height);
      });

      this.logDebug("tracking:inputResized", {
        videoWidth,
        videoHeight,
      });
    },
    setElementDisplay(element, nextDisplay) {
      if (!element || element.style.display === nextDisplay) {
        return;
      }

      element.style.display = nextDisplay;
    },
    setElementVisibility(element, nextVisibility) {
      if (!element || element.style.visibility === nextVisibility) {
        return;
      }

      element.style.visibility = nextVisibility;
    },
    updateTrackingPreviewVisibility(trackingActive) {
      const shouldShowGuides =
        trackingActive && this.shouldRenderMotionGuides();
      const debugEnabled = this.refreshTrackingDebugPreviewFlag();
      const {
        debugPreview,
        primaryVideo,
        primaryPassiveVideo,
        primaryCanvas,
        debugVideo,
        debugCanvas,
      } = this.getTrackingPreviewElements();

      this.setElementDisplay(primaryVideo, trackingActive ? "block" : "none");
      this.setElementVisibility(
        primaryVideo,
        "hidden"
      );

      this.setElementDisplay(
        primaryPassiveVideo,
        trackingActive ? "none" : "block"
      );
      this.setElementDisplay(primaryCanvas, shouldShowGuides ? "block" : "none");
      this.setElementDisplay(
        debugVideo,
        debugEnabled ? "block" : "none"
      );
      this.setElementVisibility(debugVideo, "visible");
      this.setElementDisplay(
        debugCanvas,
        trackingActive && debugEnabled ? "block" : "none"
      );
      this.setElementDisplay(debugPreview, debugEnabled ? "block" : "none");
    },
    getPreferredHolisticProcessingProfile() {
      return normalizeHolisticProcessingProfile(
        this.motionRequestedProfile || getDefaultHolisticProcessingProfile()
      );
    },
    supportsHolisticMainThread() {
      return supportsHolisticMainThreadRuntime();
    },
    supportsHolisticWorker() {
      return supportsHolisticWorkerRuntime();
    },
    supportsHolisticWorkerGpu() {
      return supportsHolisticWorkerGpuRuntime();
    },
    canUseHolisticMainThread() {
      return this.supportsHolisticMainThread();
    },
    canUseHolisticWorker() {
      return this.supportsHolisticWorker();
    },
    isHolisticMainThreadActive() {
      return this.holisticDelegateStatus === "main-cpu-active";
    },
    isHolisticWorkerActive() {
      return (
        this.holisticDelegateStatus === "worker-cpu-active" ||
        this.holisticDelegateStatus === "worker-gpu-active"
      );
    },
    getMotionWorkerCanvasSize() {
      const sourceVideo =
        document.querySelector(".tracking-primary-video") ||
        document.querySelector(".my-real-video");
      const fallbackSize = getTrackingCameraSize();

      return {
        width: Math.max(1, sourceVideo?.videoWidth || fallbackSize.width),
        height: Math.max(1, sourceVideo?.videoHeight || fallbackSize.height),
      };
    },
    openMotionSettings() {
      this.motionSettingsOpen = true;
    },
    closeMotionSettings() {
      this.motionSettingsOpen = false;
    },
    async waitForHolisticWorkerIdle(timeoutMs = 1200) {
      const startedAt = Date.now();

      while (this.holisticFrameInFlight && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
    },
    closeHolisticMainThread(reason = "") {
      if (!this.holistic) {
        return;
      }

      if (reason) {
        this.logDebug("holisticMain:close", { reason });
      }

      try {
        this.holistic.close();
      } catch (error) {
        console.warn("메인 스레드 Holistic 종료 중 오류가 발생했습니다.", error);
      }

      this.holistic = null;
    },
    disposeHolisticRuntime(reason = "") {
      this.closeHolisticMainThread(reason);
      this.destroyHolisticWorker(reason);
    },
    async refreshMotionPreviewVisibility() {
      const sourceVideoElement =
        document.querySelector(".tracking-primary-video") ||
        document.querySelector(".my-real-video");
      await this.syncTrackingDebugStream(sourceVideoElement);
      this.updateTrackingPreviewVisibility(this.motionCheck);
    },
    async disableMotionProcessing(options = {}) {
      const { announce = true } = options;

      this.motionSettingsOpen = false;
      this.motionProfileSwitching = true;
      this.motionRequestedProfile = HOLISTIC_PROCESSING_PROFILE.OFF;
      this.motionAppliedProfile = HOLISTIC_PROCESSING_PROFILE.OFF;
      this.motionCheck = false;
      this.holisticDelegate = "";
      this.holisticDelegateStatus = "motion-off";
      this.holisticFrameInFlight = false;
      this.lastHolisticVideoTime = -1;
      this.holisticTrackingLogged = false;

      try {
        await this.waitForHolisticWorkerIdle();
        this.disposeHolisticRuntime("motion-off");
        this.syncMotionStatus(0, 0, true);
        await this.refreshMotionPreviewVisibility();

        if (announce) {
          this.systemMessagePrint("모션 인식을 끕니다.");
        }

        return true;
      } finally {
        this.motionProfileSwitching = false;
      }
    },
    async handleMotionProcessingFailure(profile, reason, error = null) {
      const normalizedProfile = normalizeHolisticProcessingProfile(profile);
      const failureStatus =
        normalizedProfile === HOLISTIC_PROCESSING_PROFILE.OFF
          ? "motion-off"
          : getHolisticFailureStatusForProfile(normalizedProfile);

      this.disposeHolisticRuntime(reason);
      this.motionAppliedProfile = "";
      this.motionCheck = false;
      this.motionSettingsOpen = false;
      this.motionProfileSwitching = false;
      this.holisticDelegate = "";
      this.holisticDelegateStatus = failureStatus;
      this.holisticFrameInFlight = false;
      this.lastHolisticVideoTime = -1;
      this.holisticTrackingLogged = false;
      this.syncMotionStatus(0, 0, true);
      await this.refreshMotionPreviewVisibility();
      this.logDebug("motion:profileFailure", {
        profile: normalizedProfile,
        reason,
        message: error?.message || null,
      });
    },
    async applyMotionProcessingProfile(profile, options = {}) {
      const normalizedProfile = normalizeHolisticProcessingProfile(profile);
      const { announce = true, forceRecreate = false } = options;

      if (this.motionProfileSwitching) {
        return false;
      }

      if (normalizedProfile === HOLISTIC_PROCESSING_PROFILE.OFF) {
        return await this.disableMotionProcessing({ announce });
      }

      const alreadyActive =
        !forceRecreate &&
        this.motionCheck &&
        this.motionAppliedProfile === normalizedProfile &&
        this.holisticDelegateStatus ===
          getHolisticActiveStatusForProfile(normalizedProfile);

      this.motionSettingsOpen = false;

      if (alreadyActive) {
        await this.refreshMotionPreviewVisibility();
        return true;
      }

      this.motionProfileSwitching = true;
      this.motionRequestedProfile = normalizedProfile;
      this.holisticDelegateStatus = "profile-switching";
      this.motionCheck = false;
      this.syncMotionStatus(0, 0, true);
      await this.refreshMotionPreviewVisibility();

      try {
        await this.waitForHolisticWorkerIdle();
        await this.ensureHolisticLandmarker(normalizedProfile, null, {
          forceRecreate: true,
        });
        this.motionAppliedProfile = normalizedProfile;
        this.motionCheck = true;
        await this.refreshMotionPreviewVisibility();

        if (announce) {
          this.systemMessagePrint(
            `${formatHolisticProcessingModeLabel(normalizedProfile)} 모드로 전환합니다.`
          );
        }

        return true;
      } catch (error) {
        await this.handleMotionProcessingFailure(
          normalizedProfile,
          "profile-init-failed",
          error
        );

        if (announce) {
          this.systemMessagePrint(
            `${formatHolisticProcessingModeLabel(normalizedProfile)} 설정에 실패했습니다.`
          );
        }

        return false;
      } finally {
        this.motionProfileSwitching = false;
      }
    },
    ensureHolisticWorker() {
      if (!this.supportsHolisticWorker()) {
        return null;
      }

      if (holisticWorkerInstance) {
        return holisticWorkerInstance;
      }

      const worker = new Worker(
        new URL("../../workers/holisticWorker.js", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (event) => {
        const { requestId, ok, payload, error } = event.data || {};
        const pendingRequest = holisticWorkerPendingRequests.get(requestId);
        if (!pendingRequest) {
          return;
        }

        holisticWorkerPendingRequests.delete(requestId);

        if (ok) {
          pendingRequest.resolve(payload);
          return;
        }

        pendingRequest.reject(
          new Error(error?.message || "Holistic worker 응답에 실패했습니다.")
        );
      };

      worker.onerror = (event) => {
        const error = new Error(
          event?.message || "Holistic worker 실행 중 오류가 발생했습니다."
        );
        for (const pendingRequest of holisticWorkerPendingRequests.values()) {
          pendingRequest.reject(error);
        }
        holisticWorkerPendingRequests.clear();
        worker.terminate();
        if (holisticWorkerInstance === worker) {
          holisticWorkerInstance = null;
        }
      };

      holisticWorkerInstance = worker;

      return worker;
    },
    async postHolisticWorkerRequest(type, payload = {}, transfer = []) {
      const worker = this.ensureHolisticWorker();
      if (!worker) {
        throw new Error("Holistic worker를 사용할 수 없는 환경입니다.");
      }

      const requestId = ++holisticWorkerRequestSeq;

      return await new Promise((resolve, reject) => {
        holisticWorkerPendingRequests.set(requestId, {
          resolve,
          reject,
        });

        try {
          worker.postMessage(
            {
              requestId,
              type,
              payload,
            },
            transfer
          );
        } catch (error) {
          holisticWorkerPendingRequests.delete(requestId);
          reject(error);
        }
      });
    },
    async initHolisticWorker(options = {}) {
      return await this.postHolisticWorkerRequest("init", options);
    },
    async detectHolisticWorker(frameBitmap, timestampMs) {
      return await this.postHolisticWorkerRequest(
        "detect",
        {
          frame: frameBitmap,
          timestampMs,
        },
        [frameBitmap]
      );
    },
    destroyHolisticWorker(reason = "") {
      if (!holisticWorkerInstance) {
        return;
      }

      if (reason) {
        this.logDebug("holisticWorker:destroy", { reason });
      }

      for (const pendingRequest of holisticWorkerPendingRequests.values()) {
        pendingRequest.reject(
          new Error(reason || "Holistic worker가 종료되었습니다.")
        );
      }
      holisticWorkerPendingRequests.clear();

      try {
        holisticWorkerInstance.terminate();
      } catch (error) {
        console.warn("Holistic worker 종료 중 오류가 발생했습니다.", error);
      }

      holisticWorkerInstance = null;
    },
    async ensureHolisticLandmarker(
      profile = this.getPreferredHolisticProcessingProfile(),
      canvas = null,
      options = {}
    ) {
      const { forceRecreate = false } = options;
      const resolvedProfile = normalizeHolisticProcessingProfile(profile);
      const resolvedDelegate = getHolisticDelegateForProfile(resolvedProfile);
      const shouldUseWorker = isHolisticWorkerProfile(resolvedProfile);
      const canUseRequestedRuntime = shouldUseWorker
        ? this.canUseHolisticWorker()
        : this.canUseHolisticMainThread();
      this.logDebug("ensureHolisticLandmarker:start", {
        requestedProfile: resolvedProfile,
        resolvedDelegate,
        hasCanvas: Boolean(canvas),
        forceRecreate,
        shouldUseWorker,
        canUseRequestedRuntime,
      });

      if (resolvedProfile === HOLISTIC_PROCESSING_PROFILE.OFF) {
        this.motionAppliedProfile = HOLISTIC_PROCESSING_PROFILE.OFF;
        this.motionCheck = false;
        this.holisticDelegate = "";
        this.holisticDelegateStatus = "motion-off";
        return null;
      }

      if (!canUseRequestedRuntime) {
        this.holisticDelegate = "";
        this.holisticDelegateStatus = shouldUseWorker
          ? "worker-unavailable"
          : getHolisticFailureStatusForProfile(resolvedProfile);
        throw new Error(
          shouldUseWorker
            ? "이 브라우저는 Holistic worker를 지원하지 않습니다."
            : "이 브라우저는 브라우저 직접 처리 모드를 지원하지 않습니다."
        );
      }

      if (
        resolvedProfile === HOLISTIC_PROCESSING_PROFILE.WORKER_GPU &&
        !this.supportsHolisticWorkerGpu()
      ) {
        throw new Error("이 브라우저는 워커 + GPU(OffscreenCanvas/WebGL2)를 지원하지 않습니다.");
      }

      if (
        !forceRecreate &&
        ((shouldUseWorker && this.isHolisticWorkerActive()) ||
          (!shouldUseWorker && this.isHolisticMainThreadActive())) &&
        this.motionAppliedProfile === resolvedProfile &&
        this.holisticDelegateStatus ===
          getHolisticActiveStatusForProfile(resolvedProfile)
      ) {
        this.logDebug(
          shouldUseWorker
            ? "ensureHolisticLandmarker:reuseWorker"
            : "ensureHolisticLandmarker:reuseMain"
        );
        return shouldUseWorker ? null : this.holistic;
      }

      this.disposeHolisticRuntime("profile-recreate");

      if (!shouldUseWorker) {
        this.loadingText = "브라우저에서 모션 인식을 준비하고 있습니다.";
        this.setLoadingState(55);

        try {
          const { FilesetResolver, HolisticLandmarker } =
            await loadTasksVisionModule();

          if (!tasksVisionFilesetPromise) {
            tasksVisionFilesetPromise = FilesetResolver.forVisionTasks(
              TASKS_VISION_WASM_URL
            );
          }

          const wasmFileset = await tasksVisionFilesetPromise;
          const taskOptions = {
            baseOptions: {
              modelAssetPath: HOLISTIC_LANDMARKER_MODEL_URL,
              delegate: resolvedDelegate,
            },
            runningMode: "VIDEO",
            minFaceDetectionConfidence: CHAT_MOTION_MIN_CONFIDENCE,
            minFacePresenceConfidence: CHAT_MOTION_MIN_CONFIDENCE,
            minPoseDetectionConfidence: CHAT_MOTION_MIN_CONFIDENCE,
            minPosePresenceConfidence: CHAT_MOTION_MIN_CONFIDENCE,
            minHandLandmarksConfidence: CHAT_MOTION_MIN_CONFIDENCE,
            outputFaceBlendshapes: false,
            outputPoseSegmentationMasks: false,
          };

          this.holistic = markRaw(
            await HolisticLandmarker.createFromOptions(
              wasmFileset,
              taskOptions
            )
          );
          this.holisticDelegate = resolvedDelegate;
          this.holisticDelegateStatus =
            getHolisticActiveStatusForProfile(resolvedProfile);
          this.motionAppliedProfile = resolvedProfile;
          this.holisticEmptyFaceFrames = 0;
          this.holisticFrameInFlight = false;
          this.lastHolisticVideoTime = -1;
          this.holisticTrackingLogged = false;
          this.logDebug("ensureHolisticLandmarker:mainReady", {
            resolvedProfile,
            resolvedDelegate,
          });
          return this.holistic;
        } catch (error) {
          console.warn("브라우저 직접 처리 초기화에 실패했습니다.", error);
          this.closeHolisticMainThread("main-init-failed");
          this.holisticDelegate = "";
          this.motionAppliedProfile = "";
          this.holisticDelegateStatus =
            getHolisticFailureStatusForProfile(resolvedProfile);
          this.holisticFrameInFlight = false;
          this.lastHolisticVideoTime = -1;
          throw error;
        }
      }

      this.loadingText = "워커로 모션 인식을 준비하고 있습니다.";
      this.setLoadingState(50);

      try {
        const { width, height } = this.getMotionWorkerCanvasSize();
        await this.initHolisticWorker({
          delegate: resolvedDelegate,
          canvasWidth: width,
          canvasHeight: height,
          forceRecreate,
          minConfidence: CHAT_MOTION_MIN_CONFIDENCE,
        });
        this.holisticDelegate = resolvedDelegate;
        this.holisticDelegateStatus =
          getHolisticActiveStatusForProfile(resolvedProfile);
        this.motionAppliedProfile = resolvedProfile;
        this.holisticEmptyFaceFrames = 0;
        this.holisticFrameInFlight = false;
        this.lastHolisticVideoTime = -1;
        this.holisticTrackingLogged = false;
        this.logDebug("ensureHolisticLandmarker:workerReady");
        return null;
      } catch (error) {
        console.warn("Holistic worker 초기화에 실패했습니다.", error);
        this.destroyHolisticWorker("worker-init-failed");
        this.holisticDelegate = "";
        this.motionAppliedProfile = "";
        this.holisticDelegateStatus =
          getHolisticFailureStatusForProfile(resolvedProfile);
        this.holisticFrameInFlight = false;
        this.lastHolisticVideoTime = -1;
        throw error;
      }
    },
    avatarLoad(id) {
      console.log("1. 아바타 로드 시작");
      this.logDebug("avatarLoad:start", {
        avatarId: id,
        matchingRoom: useMainStore().option.matchingRoom,
      });
      this.cleanupAvatarPipeline();
      this.setLoadingState(5, "아바타 모델을 불러오고 있습니다.");

      //three
      const useAppleTouchRenderingProfile = isAppleTouchDevice();
      const scene = new THREE.Scene();
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !useAppleTouchRenderingProfile,
        preserveDrawingBuffer: useAppleTouchRenderingProfile,
        powerPreference: useAppleTouchRenderingProfile
          ? "default"
          : "high-performance",
      });
      const avatarRenderSize = getChatAvatarRenderSize();
      renderer.setSize(avatarRenderSize.width, avatarRenderSize.height);
      renderer.setPixelRatio(getChatRenderPixelRatio());
      renderer.domElement.id = "avatarCanvas" + useMainStore().option.matchingRoom;

      const myVideoContainer = document.getElementById("my-video");
      if (!myVideoContainer) {
        throw new Error("아바타 렌더 컨테이너를 찾을 수 없습니다.");
      }
      this.logDebug("avatarLoad:containerReady", {
        containerId: "my-video",
      });

      myVideoContainer.prepend(renderer.domElement);

      // camera
      const orbitCamera = new THREE.PerspectiveCamera(
        75,
        avatarRenderSize.width / avatarRenderSize.height,
        0.1,
        1000
      );
      orbitCamera.position.set(0.0, 1.4, 0.7);
      this.avatarRenderer = markRaw(renderer);
      this.avatarScene = markRaw(scene);
      this.avatarOrbitControls = null;

      // light
      const light = new THREE.DirectionalLight(0xffffff);
      light.position.set(1.0, 1.0, 1.0).normalize();
      scene.add(light);
      scene.background = new THREE.Color(0x252525);

      // Main Render Loop
      let lastFrameAt = performance.now();
      let lastRenderAt = 0;
      const renderFrameInterval = 1000 / CHAT_RENDER_FPS;

      const animate = (now = 0) => {
        this.avatarAnimationFrameId = requestAnimationFrame(animate);

        if (typeof document !== "undefined" && document.hidden) {
          lastFrameAt = now;
          lastRenderAt = now;
          return;
        }

        if (now - lastRenderAt < renderFrameInterval) {
          return;
        }
        lastRenderAt = now;

        if (currentVrm) {
          const deltaSeconds = Math.min((now - lastFrameAt) / 1000, 1 / 24);
          currentVrm.update(deltaSeconds);
        }
        lastFrameAt = now;
        renderer.render(scene, orbitCamera);
      };
      animate();

      // Import Character VRM
      const loader = new GLTF.GLTFLoader();
      loader.crossOrigin = "anonymous";

      // Import model from URL, add your own model here
      return new Promise((resolve, reject) => {
        loader.load(
          "vrm/" + id + ".vrm",

          async (gltf) => {
            this.logDebug("avatarLoad:gltfLoaded", {
              avatarId: id,
            });
            VRMUtils.VRMUtils.removeUnnecessaryJoints(gltf.scene);

            try {
              const vrm = await VRMUtils.VRM.from(gltf);

              vrm.humanoid.setPose({
                [VRMUtils.VRMSchema.HumanoidBoneName.LeftShoulder]: {
                  rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.0, 0.0, 0.2)).toArray()
                },
                [VRMUtils.VRMSchema.HumanoidBoneName.RightShoulder]: {
                  rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.0, 0.0, -0.2)).toArray()
                },
                [VRMUtils.VRMSchema.HumanoidBoneName.LeftUpperArm]: {
                  rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.0, 0.15, 1.1)).toArray()
                },
                [VRMUtils.VRMSchema.HumanoidBoneName.RightUpperArm]: {
                  rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.0, -0.15, -1.1)).toArray()
                },
                [VRMUtils.VRMSchema.HumanoidBoneName.LeftLowerArm]: {
                  rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0.3, 0.7)).toArray()
                },
                [VRMUtils.VRMSchema.HumanoidBoneName.RightLowerArm]: {
                  rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, -0.3, -0.7)).toArray()
                },
              });

              scene.add(vrm.scene);
              currentVrm = vrm;
              currentVrm.scene.rotation.y = Math.PI;
              this.logDebug("avatarLoad:vrmReady", {
                avatarId: id,
              });
              console.log("2. 아바타 로드 완료");
              resolve(vrm);
            } catch (error) {
              console.error(error);
              reject(error);
            }
          },

          (progress) => {
            const ratio = progress.total
              ? progress.loaded / progress.total
              : 0;
            this.setLoadingState(
              5 + ratio * 35,
              `아바타 모델 불러오는 중..<br>${Math.round(ratio * 100)}%`
            );
            console.log(
              "Loading model...",
              100.0 * ratio,
              "%"
            );
          },
          (error) => {
            console.error(error);
            reject(error);
          }
        );
      });
    },
    shouldRenderMotionGuides() {
      if (typeof window === "undefined") {
        return true;
      }

      return window.localStorage.getItem("ukm-motion-guides") !== "0";
    },

    async startHolistic() {
      console.log("3. Holistic 로드 시작");
      this.logDebug("startHolistic:start", {
        matchingRoom: useMainStore().option.matchingRoom,
      });
      this.ready = false;

      if (this.camera) {
        try {
          this.camera.stop();
        } catch (error) {
          console.warn("기존 카메라 종료 중 오류가 발생했습니다.", error);
        }
        this.camera = null;
      }

      const clamp = Kalidokit.Utils.clamp;
      const lerp = Kalidokit.Vector.lerp;

      ////////////////////////
      // Animate Rotation Helper function
      const rigRotation = (name, rotation = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        if (!currentVrm) {
          return;
        }
        const Part = currentVrm.humanoid.getBoneNode(VRMUtils.VRMSchema.HumanoidBoneName[name]);
        if (!Part) {
          return;
        }

        let euler = new THREE.Euler(
          rotation.x * dampener,
          rotation.y * dampener,
          rotation.z * dampener,
          rotation.rotationOrder || "XYZ"
        );
        let quaternion = new THREE.Quaternion().setFromEuler(euler);
        Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
      };

      // Animate Position Helper Function
      const rigPosition = (name, position = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        if (!currentVrm) {
          return;
        }
        const Part = currentVrm.humanoid.getBoneNode(VRMUtils.VRMSchema.HumanoidBoneName[name]);
        if (!Part) {
          return;
        }
        let vector = new THREE.Vector3(position.x * dampener, position.y * dampener, position.z * dampener);
        Part.position.lerp(vector, lerpAmount); // interpolate
      };

      let oldLookTarget = new THREE.Euler();
      const rigFace = (riggedFace) => {
        if (!currentVrm) {
          return;
        }
        rigRotation("Neck", riggedFace.head, 0.7);

        // Blendshapes and Preset Name Schema
        const Blendshape = currentVrm.blendShapeProxy;
        const PresetName = VRMUtils.VRMSchema.BlendShapePresetName;

        // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
        // for VRM, 1 is closed, 0 is open.
        riggedFace.eye.l = lerp(clamp(1 - riggedFace.eye.l, 0, 1), Blendshape.getValue(PresetName.Blink), 0.5);
        riggedFace.eye.r = lerp(clamp(1 - riggedFace.eye.r, 0, 1), Blendshape.getValue(PresetName.Blink), 0.5);
        riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye, riggedFace.head.y);
        Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);

        // Interpolate and set mouth blendshapes
        Blendshape.setValue(PresetName.I, lerp(riggedFace.mouth.shape.I, Blendshape.getValue(PresetName.I), 0.5));
        Blendshape.setValue(PresetName.A, lerp(riggedFace.mouth.shape.A, Blendshape.getValue(PresetName.A), 0.5));
        Blendshape.setValue(PresetName.E, lerp(riggedFace.mouth.shape.E, Blendshape.getValue(PresetName.E), 0.5));
        Blendshape.setValue(PresetName.O, lerp(riggedFace.mouth.shape.O, Blendshape.getValue(PresetName.O), 0.5));
        Blendshape.setValue(PresetName.U, lerp(riggedFace.mouth.shape.U, Blendshape.getValue(PresetName.U), 0.5));

        //PUPILS
        //interpolate pupil and keep a copy of the value
        let lookTarget = new THREE.Euler(
          lerp(oldLookTarget.x, riggedFace.pupil.y, 0.4),
          lerp(oldLookTarget.y, riggedFace.pupil.x, 0.4),
          0,
          "XYZ"
        );
        oldLookTarget.copy(lookTarget);
        currentVrm.lookAt.applyer.lookAt(lookTarget);
      };

      /* VRM Character Animator */
      const animateVRM = (vrm, results) => {
        if (!vrm) {
          return;
        }
        // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
        let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

        const faceLandmarks = results.faceLandmarks;
        // Pose 3D Landmarks are with respect to Hip distance in meters
        const pose3DLandmarks = results.ea;
        // Pose 2D landmarks are with respect to videoWidth and videoHeight
        const pose2DLandmarks = results.poseLandmarks;
        // Be careful, hand landmarks may be reversed
        const leftHandLandmarks = results.rightHandLandmarks;
        const rightHandLandmarks = results.leftHandLandmarks;

        // Animate Face
        if (faceLandmarks) {
          riggedFace = Kalidokit.Face.solve(faceLandmarks, {
            runtime: "mediapipe",
            video: videoElement,
          });
          rigFace(riggedFace);
        }

        // Animate Pose
        if (pose2DLandmarks && pose3DLandmarks) {
          riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
            runtime: "mediapipe",
            video: videoElement,
          });
          rigRotation("Hips", riggedPose.Hips.rotation, 0.7);
          rigPosition(
            "Hips",
            {
              x: riggedPose.Hips.position.x, // Reverse direction
              y: riggedPose.Hips.position.y + 1, // Add a bit of height
              z: -riggedPose.Hips.position.z, // Reverse direction
            },
            1,
            0.07
          );

          rigRotation("Chest", riggedPose.Spine, 0.25, 0.3);
          rigRotation("Spine", riggedPose.Spine, 0.45, 0.3);

          rigRotation("RightUpperArm", riggedPose.RightUpperArm, 1, 0.3);
          rigRotation("RightLowerArm", riggedPose.RightLowerArm, 1, 0.3);
          rigRotation("LeftUpperArm", riggedPose.LeftUpperArm, 1, 0.3);
          rigRotation("LeftLowerArm", riggedPose.LeftLowerArm, 1, 0.3);

          rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg, 1, 0.3);
          rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg, 1, 0.3);
          rigRotation("RightUpperLeg", riggedPose.RightUpperLeg, 1, 0.3);
          rigRotation("RightLowerLeg", riggedPose.RightLowerLeg, 1, 0.3);
        }

        // Animate Hands
        if (leftHandLandmarks) {
          riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
          rigRotation("LeftHand", {
            // Combine pose rotation Z and hand rotation X Y
            z: riggedPose.LeftHand.z,
            y: riggedLeftHand.LeftWrist.y,
            x: riggedLeftHand.LeftWrist.x,
          });
          rigRotation("LeftRingProximal", riggedLeftHand.LeftRingProximal);
          rigRotation("LeftRingIntermediate", riggedLeftHand.LeftRingIntermediate);
          rigRotation("LeftRingDistal", riggedLeftHand.LeftRingDistal);
          rigRotation("LeftIndexProximal", riggedLeftHand.LeftIndexProximal);
          rigRotation("LeftIndexIntermediate", riggedLeftHand.LeftIndexIntermediate);
          rigRotation("LeftIndexDistal", riggedLeftHand.LeftIndexDistal);
          rigRotation("LeftMiddleProximal", riggedLeftHand.LeftMiddleProximal);
          rigRotation("LeftMiddleIntermediate", riggedLeftHand.LeftMiddleIntermediate);
          rigRotation("LeftMiddleDistal", riggedLeftHand.LeftMiddleDistal);
          rigRotation("LeftThumbProximal", riggedLeftHand.LeftThumbProximal);
          rigRotation("LeftThumbIntermediate", riggedLeftHand.LeftThumbIntermediate);
          rigRotation("LeftThumbDistal", riggedLeftHand.LeftThumbDistal);
          rigRotation("LeftLittleProximal", riggedLeftHand.LeftLittleProximal);
          rigRotation("LeftLittleIntermediate", riggedLeftHand.LeftLittleIntermediate);
          rigRotation("LeftLittleDistal", riggedLeftHand.LeftLittleDistal);
        }
        if (rightHandLandmarks) {
          riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
          rigRotation("RightHand", {
            // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
            z: riggedPose.RightHand.z,
            y: riggedRightHand.RightWrist.y,
            x: riggedRightHand.RightWrist.x,
          });
          rigRotation("RightRingProximal", riggedRightHand.RightRingProximal);
          rigRotation("RightRingIntermediate", riggedRightHand.RightRingIntermediate);
          rigRotation("RightRingDistal", riggedRightHand.RightRingDistal);
          rigRotation("RightIndexProximal", riggedRightHand.RightIndexProximal);
          rigRotation("RightIndexIntermediate", riggedRightHand.RightIndexIntermediate);
          rigRotation("RightIndexDistal", riggedRightHand.RightIndexDistal);
          rigRotation("RightMiddleProximal", riggedRightHand.RightMiddleProximal);
          rigRotation("RightMiddleIntermediate", riggedRightHand.RightMiddleIntermediate);
          rigRotation("RightMiddleDistal", riggedRightHand.RightMiddleDistal);
          rigRotation("RightThumbProximal", riggedRightHand.RightThumbProximal);
          rigRotation("RightThumbIntermediate", riggedRightHand.RightThumbIntermediate);
          rigRotation("RightThumbDistal", riggedRightHand.RightThumbDistal);
          rigRotation("RightLittleProximal", riggedRightHand.RightLittleProximal);
          rigRotation("RightLittleIntermediate", riggedRightHand.RightLittleIntermediate);
          rigRotation("RightLittleDistal", riggedRightHand.RightLittleDistal);
        }
      };

      /* SETUP HOLISTIC LANDMARKER INSTANCE */
      const videoElement = await this.waitForDomElement(".tracking-primary-video");
      const guideCanvas = await this.waitForDomElement(
        "canvas.tracking-primary-canvas"
      );
      const {
        primaryPassiveVideo: inputVideoAlt,
        debugVideo,
        debugCanvas,
      } = this.getTrackingPreviewElements();
      this.prepareVideoElement(videoElement);
      this.prepareVideoElement(inputVideoAlt);
      this.prepareVideoElement(debugVideo);
      this.logDebug("startHolistic:domReady", {
        videoClass: "tracking-primary-video",
        guideCanvasClass: "tracking-primary-canvas",
      });

      const normalizeHolisticResult = (result) => ({
        faceLandmarks: Array.isArray(result?.faceLandmarks?.[0])
          ? result.faceLandmarks[0]
          : result?.faceLandmarks || null,
        poseLandmarks: Array.isArray(result?.poseLandmarks?.[0])
          ? result.poseLandmarks[0]
          : result?.poseLandmarks || null,
        ea: Array.isArray(result?.poseWorldLandmarks?.[0])
          ? result.poseWorldLandmarks[0]
          : result?.poseWorldLandmarks || result?.ea || null,
        leftHandLandmarks: Array.isArray(result?.leftHandLandmarks?.[0])
          ? result.leftHandLandmarks[0]
          : result?.leftHandLandmarks || null,
        rightHandLandmarks: Array.isArray(result?.rightHandLandmarks?.[0])
          ? result.rightHandLandmarks[0]
          : result?.rightHandLandmarks || null,
      });
      let firstHolisticFrameLogged = false;

      const getDrawRect = (sourceWidth, sourceHeight, targetWidth, targetHeight) => {
        if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) {
          return {
            drawX: 0,
            drawY: 0,
            drawWidth: targetWidth || 0,
            drawHeight: targetHeight || 0,
          };
        }

        const sourceAspect = sourceWidth / sourceHeight;
        const targetAspect = targetWidth / targetHeight;

        if (sourceAspect > targetAspect) {
          const drawWidth = targetWidth;
          const drawHeight = drawWidth / sourceAspect;
          return {
            drawX: 0,
            drawY: (targetHeight - drawHeight) / 2,
            drawWidth,
            drawHeight,
          };
        }

        const drawHeight = targetHeight;
        const drawWidth = drawHeight * sourceAspect;
        return {
          drawX: (targetWidth - drawWidth) / 2,
          drawY: 0,
          drawWidth,
          drawHeight,
        };
      };

      const drawVideoFrameIntoCanvas = (
        canvasCtx,
        sourceVideo,
        targetCanvas,
        options = {}
      ) => {
        const { mirror = true } = options;
        const { drawX, drawY, drawWidth, drawHeight } = getDrawRect(
          sourceVideo.videoWidth,
          sourceVideo.videoHeight,
          targetCanvas.width,
          targetCanvas.height
        );

        canvasCtx.save();
        if (mirror) {
          canvasCtx.translate(drawX + drawWidth, drawY);
          canvasCtx.scale(-1, 1);
          canvasCtx.drawImage(sourceVideo, 0, 0, drawWidth, drawHeight);
        } else {
          canvasCtx.drawImage(sourceVideo, drawX, drawY, drawWidth, drawHeight);
        }
        canvasCtx.restore();
      };

      const drawLandmarkPoints = (
        canvasCtx,
        targetCanvas,
        landmarks,
        options = {}
      ) => {
        if (!landmarks?.length) {
          return;
        }

        const {
          color = "#ffffff",
          radius = 2,
          mirror = false,
          sourceWidth = targetCanvas.width,
          sourceHeight = targetCanvas.height,
          step = 1,
        } = options;

        const { drawX, drawY, drawWidth, drawHeight } = getDrawRect(
          sourceWidth,
          sourceHeight,
          targetCanvas.width,
          targetCanvas.height
        );
        const adaptiveRadius =
          radius *
          Math.min(
            2.2,
            Math.max(0.85, Math.min(sourceWidth, sourceHeight) / 360)
          );

        canvasCtx.fillStyle = color;

        for (let index = 0; index < landmarks.length; index += step) {
          const landmark = landmarks[index];
          if (
            typeof landmark?.x !== "number" ||
            typeof landmark?.y !== "number"
          ) {
            continue;
          }

          const normalizedX = mirror ? 1 - landmark.x : landmark.x;
          const x = drawX + normalizedX * drawWidth;
          const y = drawY + landmark.y * drawHeight;

          canvasCtx.beginPath();
          canvasCtx.arc(x, y, adaptiveRadius, 0, Math.PI * 2);
          canvasCtx.fill();
        }
      };

      const drawTrackingPreviewCanvas = (
        sourceVideo,
        targetCanvas,
        results,
        options = {}
      ) => {
        if (!targetCanvas || !sourceVideo) {
          return;
        }

        const { drawVideoFrame: shouldDrawVideoFrame = true, mirror = true } = options;

        targetCanvas.width = sourceVideo.videoWidth;
        targetCanvas.height = sourceVideo.videoHeight;
        let canvasCtx = targetCanvas.getContext("2d");
        canvasCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        if (shouldDrawVideoFrame) {
          drawVideoFrameIntoCanvas(canvasCtx, sourceVideo, targetCanvas, { mirror });
        }
        drawLandmarkPoints(canvasCtx, targetCanvas, results.faceLandmarks, {
          color: "#55f6ff",
          radius: 2.8,
          mirror,
          sourceWidth: sourceVideo.videoWidth,
          sourceHeight: sourceVideo.videoHeight,
          step: 1,
        });
        drawLandmarkPoints(canvasCtx, targetCanvas, results.bodyPoseLandmarks, {
          color: "#ff0364",
          radius: 2.8,
          mirror,
          sourceWidth: sourceVideo.videoWidth,
          sourceHeight: sourceVideo.videoHeight,
        });
        drawLandmarkPoints(canvasCtx, targetCanvas, results.leftHandLandmarks, {
          color: "#00cff7",
          radius: 2.4,
          mirror,
          sourceWidth: sourceVideo.videoWidth,
          sourceHeight: sourceVideo.videoHeight,
        });
        drawLandmarkPoints(canvasCtx, targetCanvas, results.rightHandLandmarks, {
          color: "#ff0364",
          radius: 2.4,
          mirror,
          sourceWidth: sourceVideo.videoWidth,
          sourceHeight: sourceVideo.videoHeight,
        });
      };

      const drawResults = (results) => {
        if (!guideCanvas || !videoElement) {
          return;
        }

        const renderGuides = this.shouldRenderMotionGuides();

        if (!renderGuides) {
          this.updateTrackingPreviewVisibility(this.motionCheck);
          return;
        }

        const bodyPoseLandmarks = Array.isArray(results.poseLandmarks)
          ? results.poseLandmarks.filter((_, index) => index >= 11)
          : [];
        const drawPayload = {
          ...results,
          bodyPoseLandmarks,
        };

        this.updateTrackingPreviewVisibility(true);

        const visibleGuideCanvas = debugCanvas || guideCanvas;
        if (!visibleGuideCanvas) {
          return;
        }

        drawTrackingPreviewCanvas(videoElement, visibleGuideCanvas, drawPayload, {
          drawVideoFrame: false,
          mirror: true,
        });
      };

      const processHolisticFrame = async () => {
        const workerActive = this.isHolisticWorkerActive();
        const mainThreadActive = this.isHolisticMainThreadActive();
        if (
          !videoElement ||
          videoElement.readyState < 2 ||
          this.motionProfileSwitching ||
          (!workerActive && !mainThreadActive) ||
          !this.motionCheck
        ) {
          return;
        }

        const currentVideoTime = videoElement.currentTime;
        if (this.holisticFrameInFlight || currentVideoTime === this.lastHolisticVideoTime) {
          return;
        }

        let result;
        this.holisticFrameInFlight = true;
        try {
          this.lastHolisticVideoTime = currentVideoTime;
          const detectTimestamp = performance.now();
          if (workerActive) {
            const frameBitmap = await createImageBitmap(videoElement);
            result = await this.detectHolisticWorker(
              frameBitmap,
              detectTimestamp
            );
          } else {
            result = this.holistic?.detectForVideo(
              videoElement,
              detectTimestamp
            );
          }
        } catch (error) {
          const errorMessage = error?.message || "";
          console.warn("Holistic 추론에 실패했습니다.", error);
          this.lastHolisticVideoTime = -1;
          this.holisticFrameInFlight = false;

          if (!workerActive && errorMessage.includes("runningMode")) {
            this.logDebug("startHolistic:runningModeRetry", {
              currentVideoTime,
              profile: this.motionRequestedProfile,
            });
            return;
          }

          if (!this.motionProfileSwitching) {
            await this.handleMotionProcessingFailure(
              this.motionRequestedProfile,
              workerActive ? "worker-detect-failed" : "main-detect-failed",
              error
            );
            this.systemMessagePrint(
              `${this.motionProcessingModeLabel} 상태로 중지되었습니다.`
            );
          }

          return;
        }
        try {
          const normalizedResult = normalizeHolisticResult(result);
          const faceCount = normalizedResult.faceLandmarks?.length || 0;
          const poseCount = normalizedResult.poseLandmarks?.length || 0;
          this.syncMotionStatus(faceCount, poseCount);
          if (!firstHolisticFrameLogged) {
            firstHolisticFrameLogged = true;
            this.logDebug("startHolistic:firstDetectSuccess", {
              readyState: videoElement.readyState,
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              faceCount,
              poseCount,
            });
          }

          if (
            !this.holisticTrackingLogged &&
            (faceCount > 0 || poseCount > 0)
          ) {
            this.holisticTrackingLogged = true;
            this.logDebug("startHolistic:trackingDetected", {
              faceCount,
              poseCount,
            });
          }

          drawResults(normalizedResult);
          animateVRM(currentVrm, normalizedResult);

          if (normalizedResult.faceLandmarks?.length) {
            this.holisticEmptyFaceFrames = 0;
            return;
          }

          this.holisticEmptyFaceFrames += 1;

        } finally {
          this.holisticFrameInFlight = false;
        }
      };
      const preferredProfile =
        this.getPreferredHolisticProcessingProfile();
      this.logDebug("startHolistic:preferredDelegate", {
        preferredProfile,
        processingMode: preferredProfile,
      });

      try {
        await this.ensureHolisticLandmarker(preferredProfile, guideCanvas);
      } catch (error) {
        await this.handleMotionProcessingFailure(
          preferredProfile,
          "startup-profile-init-failed",
          error
        );
        this.setLoadingState(60, "모션 설정 없이 계속 준비하고 있습니다.");
        this.logDebug("startHolistic:initFailed", {
          preferredProfile,
          message: error?.message || String(error),
        });
      }

      // Use `Mediapipe` utils to get camera - lower resolution = higher fps
      this.setLoadingState(70, "카메라를 초기화하고 있습니다.");
      this.logDebug("startHolistic:cameraCreate");
      this.camera = this.createTrackingCamera(videoElement, processHolisticFrame);
      await Promise.resolve(this.camera.start());
      await this.waitForVideoReady(videoElement);
      try {
        await videoElement.play();
      } catch (error) {
        console.warn("카메라 프리뷰 재생 요청에 실패했습니다.", error);
      }
      this.syncTrackingPreviewAspectRatio(
        videoElement.videoWidth,
        videoElement.videoHeight
      );
      await this.syncTrackingDebugStream(videoElement);
      this.updateTrackingPreviewVisibility(true);
      this.logDebug("startHolistic:cameraStarted", {
        readyState: videoElement.readyState,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
      });
      this.ready = true;
      ////////////////////////

      // capture
      const avatarCanvas = await this.waitForAvatarCanvas();
      this.logDebug("startHolistic:avatarCanvasReady", {
        canvasId: avatarCanvas.id,
        width: avatarCanvas.width,
        height: avatarCanvas.height,
      });
      avatarCanvas.style.display = "inline-block";

      const testVideo = await this.waitForDomElement("test-video", { by: "id" });
      this.prepareVideoElement(testVideo);
      this.logDebug("startHolistic:testVideoReady", {
        testVideoId: "test-video",
      });
      if (testVideo.srcObject) {
        const tracks = testVideo.srcObject.getTracks?.() || [];
        tracks.forEach((track) => track.stop());
      }
      testVideo.srcObject = avatarCanvas.captureStream(CHAT_CAPTURE_FPS);
      try {
        await testVideo.play();
      } catch (error) {
        console.warn("아바타 캡처 비디오 재생 요청에 실패했습니다.", error);
      }
      this.logDebug("startHolistic:captureStreamReady", {
        trackCount: testVideo.srcObject?.getVideoTracks?.().length || 0,
      });

      var avatarVideo = testVideo.srcObject.getVideoTracks()[0];

      console.log("4. Holistic 로드 완료");
      this.setLoadingState(85, "모션 인식 준비가 완료되었습니다.");

      return avatarVideo;
    },

    async switchPublishedVideoTrack(nextTrack, options = {}) {
      if (!this.room) {
        throw new Error('LiveKit room이 초기화되지 않았습니다.')
      }

      const {
        stopPrevious = true,
        trackName = 'camera',
      } = options

      const previousTrack = this.localVideoTrack

      if (previousTrack && previousTrack !== nextTrack) {
        try {
          await this.room.localParticipant.unpublishTrack(previousTrack)
        } catch (error) {
          console.warn('기존 비디오 트랙 언퍼블리시 중 오류가 발생했습니다.', error)
        }

        if (stopPrevious && typeof previousTrack.stop === 'function') {
          try {
            previousTrack.stop()
          } catch (error) {
            console.warn('기존 비디오 트랙 정지 중 오류가 발생했습니다.', error)
          }
        }
      }

      const publication = await this.room.localParticipant.publishTrack(nextTrack, {
        name: trackName,
        source: Track.Source.Camera,
      })

      this.localVideoTrack = publication.track || nextTrack
    },

    resetLiveKitState() {
      this.participantToken = '';
      this.roomServerUrl = '';
      this.room = undefined;
      this.localVideoTrack = null;
      this.localAudioTrack = null;
    },

    async leaveSession(options = {}) {
      const { navigate = true } = options;

      if (this.leavingSession) {
        if (navigate) {
          window.location.href = buildFrontendUrl('/main');
        }
        return;
      }

      this.leavingSession = true;

      if (this.room) {
        try {
          this.room.disconnect();
        } catch (error) {
          console.warn('LiveKit 룸 종료 중 오류가 발생했습니다.', error);
        }
      }

      if (this.localVideoTrack && typeof this.localVideoTrack.stop === 'function') {
        try {
          this.localVideoTrack.stop();
        } catch (error) {
          console.warn('로컬 비디오 트랙 종료 중 오류가 발생했습니다.', error);
        }
      }

      if (this.localAudioTrack && typeof this.localAudioTrack.stop === 'function') {
        try {
          this.localAudioTrack.stop();
        } catch (error) {
          console.warn('로컬 오디오 트랙 종료 중 오류가 발생했습니다.', error);
        }
      }

      if (this.webSocket) {
        try {
          this.webSocket.close();
        } catch (error) {
          console.warn('채팅 웹소켓 종료 중 오류가 발생했습니다.', error);
        }
        this.webSocket = null;
      }

      if (this.camera) {
        try {
          this.camera.stop();
        } catch (error) {
          console.warn('카메라 종료 중 오류가 발생했습니다.', error);
        }
        this.camera = null;
      }

      this.cleanupAvatarPipeline({ stopCamera: false });

      this.resetLiveKitState();
      this.resetSessionUiState();
      this.leavingSession = false;

      if (navigate) {
        window.location.href = buildFrontendUrl('/main');
      }
    },

    socketConnect(seq) {
      const self = this;
      //socket test
      console.log("socket test");
      // 1. 웹소켓 클라이언트 객체 생성
      if (this.webSocket) {
        try {
          this.webSocket.close();
        } catch (error) {
          console.warn('기존 채팅 웹소켓 종료 중 오류가 발생했습니다.', error);
        }
      }

      const webSocket = new WebSocket(buildBackendWsUrl('/ws/chat'));

      this.webSocket = webSocket;

      // 2. 웹소켓 이벤트 처리
      // 2-1) 연결 이벤트 처리
      webSocket.onopen = () => {
        console.log("웹소켓서버와 연결 성공");
        webSocket.send(`{
          "key" : "chat_start_${useMainStore().option.matchingRoom}",
          "room_seq" : "${self.SessionName}",
          "user_seq" : "${seq}"
        }`);
      };

      // 2-2) 메세지 수신 이벤트 처리
      webSocket.onmessage = function (event) {
        console.log(`서버 웹소켓에게 받은 데이터: ${event.data}`);
        const test = event.data.replace(/,\s*}$/, '}');
        const jsonData = JSON.parse(test);
        console.log(jsonData);
        if (jsonData.key == "uknowme") {
          self.systemMessagePrint("카메라가 공개되었습니다.")
          self.toCam();
          self.heartRainFlag = true;
          setTimeout(() => {
            self.heartRainFlag = false;
          }, 3000);
        }
        if (jsonData.key == "balance_q_response_" + useMainStore().option.matchingRoom) {
          self.systemMessagePrint("밸런스 게임이 시작되었습니다.")
          self.systemMessagePrint(jsonData.answer1+" / "+jsonData.answer2);
          self.systemMessagePrint("선택해 주세요.");
          self.gameQ = jsonData.question;
          self.gameA1 = jsonData.answer1;
          self.gameA2 = jsonData.answer2;
          self.gameBtn = 1;
        }
        if (jsonData.key == "balance_a_response_" + useMainStore().option.matchingRoom) {
          self.systemMessagePrint(jsonData.nickName + "님이 " + jsonData.question + "을 선택했습니다.")
        }
      };

      // 2-3) 연결 종료 이벤트 처리
      webSocket.onclose = function () {
        self.webSocket = null;
        console.log("서버 웹소켓 연결 종료");
      };

      // 2-4) 에러 발생 이벤트 처리
      webSocket.onerror = function (event) {
        console.log(event);
      };
    },

    systemMessagePrint(text) {
      this.prependChatMessage({
        type: "system",
        text,
      });
    },

    prependChatMessage(message) {
      this.chatMessages.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        time: this.time,
        ...message,
      });
    },

    balanceClick() {
      if (this.soloMode || !this.webSocket) {
        this.systemMessagePrint("테스트 세션에서는 밸런스 게임을 사용할 수 없습니다.")
        return
      }

      let message = `{
        "key" : "balance_q_request_${useMainStore().option.matchingRoom}",
        "room" : "${this.SessionName}"
      }`
      console.log("밸런스게임 버튼", message);

      this.webSocket.send(message);
    },

    balanceAnswerClick(answser) {
      if (this.soloMode || !this.webSocket) {
        this.gameBtn = 0
        return
      }

      this.gameBtn = 0
      let message = `{
        "key" : "balance_a_request_${useMainStore().option.matchingRoom}",
        "room" : "${this.SessionName}",
        "nickName" : "${useAccountStore().currentUser.nickname}",
        "question" : "${this.gameQ}",
        "answser" : "${answser}"
      }`
      console.log("밸런스게임 선택 버튼", message);

      this.webSocket.send(message);
    },

    async motionClick() {
      this.openMotionSettings();
    },

    heartClick() {
      if (this.soloMode || !this.webSocket) {
        this.systemMessagePrint("테스트 세션에서는 하트 기능을 사용할 수 없습니다.")
        return
      }

      if (useMainStore().option.matchingRoom == "1") {
        this.systemMessagePrint("하트를 보냈습니다. 서로 하트를 누르면 카메라가 공개됩니다.")
      }
      if (useMainStore().option.matchingRoom == "2") {
        this.systemMessagePrint("하트를 보냈습니다. 모든 참가자가 누르면 카메라가 공개됩니다.")
      }

      let message = `{
        "key" : "heart_${useMainStore().option.matchingRoom}",
        "room" : "${this.SessionName}"
      }`
      console.log("하트 버튼", message);

      this.webSocket.send(message);
    },

    toCam() {
      // 실시간 카메라 모드로 전환하면서 모션 추적을 정리합니다.
      this.motionCheck = false;
      this.motionSettingsOpen = false;

      const videoElement = document.querySelector(".my-real-video");
      if (!videoElement) {
        console.warn("실제 카메라 비디오 요소를 찾을 수 없습니다.");
        return;
      }
      this.prepareVideoElement(videoElement);
      videoElement.style.display = "block";

      this.cleanupAvatarPipeline();
      this.camera = this.createPassiveCamera(videoElement);
      this.camera.start();
      this.syncTrackingDebugStream(videoElement);
      this.updateTrackingPreviewVisibility(false);

      if (!this.room || this.soloMode) {
        return
      }

      createLocalVideoTrack()
        .then(newTrack => this.switchPublishedVideoTrack(newTrack, {
          trackName: 'real-camera',
        }))
        .catch(error => {
          console.warn('실제 카메라 전환 중 오류가 발생했습니다.', error);
        });
    },
    keywordMessage() {
      const account = useAccountStore()
      axios({
        url: sr.features.keywordRand(),
        method: 'get',
        headers: account.authHeader,
      })
        .then(res => {
          this.keywordMessagePrint(res.data.keyword)
        })
        .catch(err => {
          console.error(err.response)
        })
    },
    keywordMessagePrint(text) {
      this.prependChatMessage({
        type: "keyword",
        keyword: text,
      });
    },
  },
})
