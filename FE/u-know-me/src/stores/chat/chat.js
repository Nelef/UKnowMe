import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import * as THREE from "three";
import * as GLTF from "three/examples/jsm/loaders/GLTFLoader";
import * as OrbitControls from "three/examples/jsm/controls/OrbitControls";
import * as VRMUtils from "@pixiv/three-vrm";
import * as Kalidokit from "kalidokit";
import * as DrawConnectors from "@mediapipe/drawing_utils";
import { useMainStore } from '../main/main';
import { useAccountStore } from '../land/account';
import { buildBackendWsUrl, buildFrontendUrl } from '@/config/runtime'
import { Track, createLocalVideoTrack } from 'livekit-client'

import sr from '@/api/spring-rest'
import axios from 'axios'


let currentVrm;
let tasksVisionFilesetPromise;
let tasksVisionModulePromise;
let trackingFrameHandler = null;

const PUBLIC_BASE_URL = (process.env.BASE_URL || "/").replace(/\/+$/, "");
const buildPublicAssetUrl = (assetPath) =>
  `${PUBLIC_BASE_URL}/${assetPath}`.replace(/\/{2,}/g, "/");

const TASKS_VISION_WASM_URL = buildPublicAssetUrl("mediapipe/wasm");
const TASKS_VISION_MODULE_URL = buildPublicAssetUrl("mediapipe/vision_bundle.mjs");
const HOLISTIC_LANDMARKER_MODEL_URL = buildPublicAssetUrl(
  "mediapipe/models/holistic_landmarker.task"
);

const loadTasksVisionModule = async () => {
  if (!tasksVisionModulePromise) {
    tasksVisionModulePromise = import(
      /* webpackIgnore: true */ TASKS_VISION_MODULE_URL
    );
  }

  return tasksVisionModulePromise;
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
    webSocket: null,
    room: undefined,
    participantToken: '',
    roomServerUrl: '',
    localVideoTrack: null,
    localAudioTrack: null,
    camera: null,
    holistic: null,
    holisticDelegate: '',
    holisticFallbackAttempted: false,
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
    motionCheck: true,
    time: "채팅시작!",
    mobile: false,
    gameQ : "질문",
    gameA1 : "답1",
    gameA2 : "답2",
    ready: false,
    heartRainFlag: false,
    leavingSession: false,
    soloMode: false,
    liveKitQuotaModal: false,
    debugMessages: [],
  }),
  getters: {

  },
  actions: {
    logDebug(stage, details = {}) {
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
        window.__UKM_CHAT_DEBUG__ = this.debugMessages.slice();
      }

      console.log("[UKM-CHAT]", stage, details);
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
      this.mobile = false;
      this.accuseBtn = 0;
      this.gameBtn = 0;
      this.loadingProgress = 0;
      this.debugMessages = [];
      this.motionFaceCount = 0;
      this.motionPoseCount = 0;
      this.holisticTrackingLogged = false;

      if (typeof window !== "undefined") {
        window.__UKM_CHAT_DEBUG__ = [];
      }
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
      this.holisticDelegate = '';
      this.holisticFallbackAttempted = false;
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

      const guidesCanvas = document.querySelector("canvas.guides");
      if (guidesCanvas) {
        const canvasCtx = guidesCanvas.getContext("2d");
        canvasCtx?.clearRect(0, 0, guidesCanvas.width, guidesCanvas.height);
      }

      this.avatarScene = null;
      this.ready = false;
      trackingFrameHandler = null;
    },
    createTrackingCamera(videoElement, frameHandler) {
      let mediaStream = null;
      let animationFrameId = null;
      let active = false;

      const tick = async () => {
        if (!active) {
          return;
        }

        if (frameHandler) {
          await frameHandler();
        }

        animationFrameId = window.requestAnimationFrame(tick);
      };

      return {
        start: async () => {
          active = true;
          this.prepareVideoElement(videoElement);
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              width: 640,
              height: 480,
              facingMode: "user",
            },
          });
          videoElement.srcObject = mediaStream;
          await videoElement.play();
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
    getPreferredHolisticDelegate() {
      return "CPU";
    },
    async ensureHolisticLandmarker(
      delegate = this.getPreferredHolisticDelegate(),
      canvas = null,
      options = {}
    ) {
      const { forceRecreate = false } = options;
      this.logDebug("ensureHolisticLandmarker:start", {
        requestedDelegate: delegate,
        hasCanvas: Boolean(canvas),
        forceRecreate,
      });

      if (!forceRecreate && this.holistic && this.holisticDelegate === delegate) {
        this.logDebug("ensureHolisticLandmarker:reuse", {
          delegate,
          hasCanvas: Boolean(canvas),
        });
        return this.holistic;
      }

      if (this.holistic) {
        try {
          this.holistic.close();
        } catch (error) {
          console.warn("기존 HolisticLandmarker 종료 중 오류가 발생했습니다.", error);
        }
        this.holistic = null;
      }

      this.loadingText = `모션 모델 초기화 중..<br>${delegate}`;
      this.setLoadingState(delegate === "GPU" ? 45 : 55);

      this.logDebug("ensureHolisticLandmarker:moduleImport");
      const { FilesetResolver, HolisticLandmarker } = await loadTasksVisionModule();
      this.logDebug("ensureHolisticLandmarker:moduleImportDone");

      if (!tasksVisionFilesetPromise) {
        this.logDebug("ensureHolisticLandmarker:filesetCreate", {
          wasmUrl: TASKS_VISION_WASM_URL,
        });
        tasksVisionFilesetPromise = FilesetResolver.forVisionTasks(
          TASKS_VISION_WASM_URL
        );
      }

      const wasmFileset = await tasksVisionFilesetPromise;
      const resolvedDelegate =
        delegate === "GPU" && !canvas
          ? "CPU"
          : delegate;

      this.logDebug("ensureHolisticLandmarker:filesetReady", {
        resolvedDelegate,
      });

      this.logDebug("ensureHolisticLandmarker:createFromOptions", {
        resolvedDelegate,
        modelAssetPath: HOLISTIC_LANDMARKER_MODEL_URL,
        hasCanvas: Boolean(canvas),
      });
      this.holistic = markRaw(await HolisticLandmarker.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath: HOLISTIC_LANDMARKER_MODEL_URL,
          delegate: resolvedDelegate,
        },
        ...(resolvedDelegate === "GPU" && canvas ? { canvas } : {}),
        runningMode: "VIDEO",
        minFaceDetectionConfidence: 0.6,
        minFacePresenceConfidence: 0.6,
        minPoseDetectionConfidence: 0.6,
        minPosePresenceConfidence: 0.6,
        minHandLandmarksConfidence: 0.6,
        outputFaceBlendshapes: false,
        outputPoseSegmentationMasks: false,
      }));
      this.logDebug("ensureHolisticLandmarker:createFromOptionsDone", {
        resolvedDelegate,
      });

      this.holisticDelegate = resolvedDelegate;
      this.holisticFallbackAttempted = resolvedDelegate === "CPU";
      this.holisticEmptyFaceFrames = 0;
      this.holisticFrameInFlight = false;
      this.lastHolisticVideoTime = -1;
      this.holisticTrackingLogged = false;

      return this.holistic;
    },
    avatarLoad(id) {
      console.log("1. 아바타 로드 시작");
      this.logDebug("avatarLoad:start", {
        avatarId: id,
        matchingRoom: useMainStore().option.matchingRoom,
      });
      this.cleanupAvatarPipeline();
      this.setLoadingState(5, "아바타 모델 불러오는 중..");

      //three
      const scene = new THREE.Scene();
      const renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(640, 480);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
        640 / 480,
        0.1,
        1000
      );
      orbitCamera.position.set(0.0, 1.4, 0.7);

      // controls
      const orbitControls = new OrbitControls.OrbitControls(
        orbitCamera,
        renderer.domElement
      );
      orbitControls.enableDamping = true;
      orbitControls.target.set(0.0, 1.4, 0.0);
      orbitControls.enablePan = false;
      orbitControls.maxDistance = 1;
      orbitControls.minDistance = 0.5;
      orbitControls.minPolarAngle = 1;
      orbitControls.maxPolarAngle = 2.5;
      orbitControls.minAzimuthAngle = -1;
      orbitControls.maxAzimuthAngle = 1;
      this.avatarRenderer = markRaw(renderer);
      this.avatarScene = markRaw(scene);
      this.avatarOrbitControls = markRaw(orbitControls);

      // light
      const light = new THREE.DirectionalLight(0xffffff);
      light.position.set(1.0, 1.0, 1.0).normalize();
      scene.add(light);
      scene.background = new THREE.Color(0x252525);

      // Main Render Loop
      const clock = new THREE.Clock();

      const animate = () => {
        this.avatarAnimationFrameId = requestAnimationFrame(animate);
        orbitControls.update();

        if (currentVrm) {
          // Update model to render physics
          currentVrm.update(clock.getDelta());
        }
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
      let videoElement = await this.waitForDomElement(".input_video"),
        guideCanvas = await this.waitForDomElement("canvas.guides");
      const inputVideoAlt = document.querySelector(".input_video2");
      this.prepareVideoElement(videoElement);
      this.prepareVideoElement(inputVideoAlt);
      this.logDebug("startHolistic:domReady", {
        videoClass: "input_video",
        guideCanvasClass: "guides",
      });

      const normalizeHolisticResult = (result) => ({
        faceLandmarks: result.faceLandmarks?.[0] || null,
        poseLandmarks: result.poseLandmarks?.[0] || null,
        ea: result.poseWorldLandmarks?.[0] || null,
        leftHandLandmarks: result.leftHandLandmarks?.[0] || null,
        rightHandLandmarks: result.rightHandLandmarks?.[0] || null,
      });
      let firstHolisticFrameLogged = false;

      const drawResults = (results) => {
        if (!guideCanvas || !videoElement) {
          return;
        }

        guideCanvas.width = videoElement.videoWidth;
        guideCanvas.height = videoElement.videoHeight;
        let canvasCtx = guideCanvas.getContext("2d");
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
        // Use `Mediapipe` drawing functions
        DrawConnectors.drawLandmarks(canvasCtx, results.poseLandmarks, {
          color: "#ff0364",
          lineWidth: 2,
        });
        if (results.faceLandmarks && results.faceLandmarks.length >= 473) {
          //draw pupils
          DrawConnectors.drawLandmarks(canvasCtx, [results.faceLandmarks[468], results.faceLandmarks[468 + 5]], {
            color: "#ffe603",
            lineWidth: 2,
          });
        }
        DrawConnectors.drawLandmarks(canvasCtx, results.leftHandLandmarks, {
          color: "#00cff7",
          lineWidth: 2,
        });
        DrawConnectors.drawLandmarks(canvasCtx, results.rightHandLandmarks, {
          color: "#ff0364",
          lineWidth: 2,
        });
        canvasCtx.restore();
      };

      const processHolisticFrame = async () => {
        if (!videoElement || videoElement.readyState < 2 || !this.holistic) {
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
          result = this.holistic.detectForVideo(videoElement, performance.now());
        } catch (error) {
          const message = error?.message || "";
          if (!message.includes("runningMode")) {
            this.holisticFrameInFlight = false;
            throw error;
          }

          console.warn("HolisticLandmarker VIDEO 프레임을 다음 루프에서 다시 시도합니다.", error);
          this.logDebug("startHolistic:runningModeRetry", {
            currentVideoTime,
            delegate: this.holisticDelegate || preferredDelegate,
          });
          this.lastHolisticVideoTime = -1;
          this.holisticFrameInFlight = false;
          return;
        }
        try {
          const normalizedResult = normalizeHolisticResult(result);
          this.motionFaceCount = normalizedResult.faceLandmarks?.length || 0;
          this.motionPoseCount = normalizedResult.poseLandmarks?.length || 0;
          if (!firstHolisticFrameLogged) {
            firstHolisticFrameLogged = true;
            this.logDebug("startHolistic:firstDetectSuccess", {
              readyState: videoElement.readyState,
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              faceCount: this.motionFaceCount,
              poseCount: this.motionPoseCount,
            });
          }

          if (
            !this.holisticTrackingLogged &&
            (this.motionFaceCount > 0 || this.motionPoseCount > 0)
          ) {
            this.holisticTrackingLogged = true;
            this.logDebug("startHolistic:trackingDetected", {
              faceCount: this.motionFaceCount,
              poseCount: this.motionPoseCount,
            });
          }

          drawResults(normalizedResult);
          animateVRM(currentVrm, normalizedResult);

          if (normalizedResult.faceLandmarks?.length) {
            this.holisticEmptyFaceFrames = 0;
            return;
          }

          this.holisticEmptyFaceFrames += 1;

          if (
            this.holisticDelegate === "GPU" &&
            !this.holisticFallbackAttempted &&
            this.holisticEmptyFaceFrames >= 20 &&
            /Android/i.test(navigator.userAgent || "")
          ) {
            console.warn("GPU HolisticLandmarker에서 얼굴 인식이 불안정해 CPU delegate로 전환합니다.");
            this.holisticFallbackAttempted = true;
            await this.ensureHolisticLandmarker("CPU");
          }
        } finally {
          this.holisticFrameInFlight = false;
        }
      };
      trackingFrameHandler = processHolisticFrame;

      const preferredDelegate = this.getPreferredHolisticDelegate();
      this.logDebug("startHolistic:preferredDelegate", {
        preferredDelegate,
      });

      try {
        await this.ensureHolisticLandmarker(preferredDelegate, guideCanvas);
      } catch (error) {
        if (preferredDelegate === "GPU") {
          console.warn("GPU HolisticLandmarker 초기화에 실패해 CPU delegate로 재시도합니다.", error);
          this.setLoadingState(55, "모션 모델 초기화 재시도 중..<br>CPU");
          await this.ensureHolisticLandmarker("CPU");
        } else {
          throw error;
        }
      }

      // Use `Mediapipe` utils to get camera - lower resolution = higher fps
      this.setLoadingState(70, "카메라 초기화 중..");
      this.logDebug("startHolistic:cameraCreate");
      this.camera = this.createTrackingCamera(videoElement, processHolisticFrame);
      await Promise.resolve(this.camera.start());
      await this.waitForVideoReady(videoElement);
      try {
        await videoElement.play();
      } catch (error) {
        console.warn("카메라 프리뷰 재생 요청에 실패했습니다.", error);
      }
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
      testVideo.srcObject = avatarCanvas.captureStream();
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
      this.setLoadingState(85, "모션 인식 준비 완료");

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
          self.systemMessagePrint("서로의 하트가 눌렸습니다! 카메라로 변경됩니다.")
          self.toCam();
          self.heartRainFlag = true;
          setTimeout(() => {
            self.heartRainFlag = false;
          }, 3000);
        }
        if (jsonData.key == "balance_q_response_" + useMainStore().option.matchingRoom) {
          self.systemMessagePrint("밸런스게임이 시작되었습니다.")
          self.systemMessagePrint(jsonData.answer1+" / "+jsonData.answer2);
          self.systemMessagePrint("당신의 선택은?");
          self.gameQ = jsonData.question;
          self.gameA1 = jsonData.answer1;
          self.gameA2 = jsonData.answer2;
          self.gameBtn = 1;
        }
        if (jsonData.key == "balance_a_response_" + useMainStore().option.matchingRoom) {
          self.systemMessagePrint(jsonData.nickName + "님이 "+jsonData.question+"을(를) 선택하셨습니다.")
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
      let p = document.createElement("p");
      let p2 = document.createElement("p");
      p.textContent = this.time + " : " + text;
      p2.textContent =  this.time + " : " + text;

      document.querySelector(".keyword-content-mobile").prepend(p);
      document.querySelector(".keyword-content").prepend(p2);
    },

    balanceClick() {
      if (this.soloMode || !this.webSocket) {
        this.systemMessagePrint("혼자 해보기에서는 밸런스 게임을 사용할 수 없습니다.")
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

    motionClick() {
      if (!this.camera) {
        return
      }

      this.camera.stop();
      const inputVideo = document.querySelector(".input_video");
      const inputVideoAlt = document.querySelector(".input_video2");

      if (!inputVideo || !inputVideoAlt) {
        console.warn("모션 인식 비디오 요소를 찾을 수 없습니다.");
        return;
      }

      let videoElement;

      if (this.motionCheck == true) {
        this.motionCheck = false;
        this.systemMessagePrint("모션인식을 중지합니다.")
        inputVideo.style.display = "none";
        inputVideoAlt.style.display = "block";
        this.prepareVideoElement(inputVideoAlt);
        videoElement = inputVideoAlt;
      } else {
        this.motionCheck = true;
        this.systemMessagePrint("모션인식을 재시작합니다.")
        inputVideo.style.display = "block";
        inputVideoAlt.style.display = "none";
        this.prepareVideoElement(inputVideo);
        videoElement = inputVideo;
      }

      this.camera = this.motionCheck
        ? this.createTrackingCamera(videoElement, trackingFrameHandler)
        : this.createPassiveCamera(videoElement);
      this.camera.start();
    },

    heartClick() {
      if (this.soloMode || !this.webSocket) {
        this.systemMessagePrint("혼자 해보기에서는 하트 기능을 사용할 수 없습니다.")
        return
      }

      if (useMainStore().option.matchingRoom == "1") {
        this.systemMessagePrint("하트를 눌렸습니다! 상대방이 하트를 누르면 서로의 카메라가 공개됩니다.")
      }
      if (useMainStore().option.matchingRoom == "2") {
        this.systemMessagePrint("하트를 눌렸습니다! 모든사람이 하트를 누르면 모두의 카메라가 공개됩니다.")
      }

      let message = `{
        "key" : "heart_${useMainStore().option.matchingRoom}",
        "room" : "${this.SessionName}"
      }`
      console.log("하트 버튼", message);

      this.webSocket.send(message);
    },

    toCam() {
      // 모션 인식 버튼 비활성화
      this.motionCheck = false;
      var motionBtn = document.querySelectorAll(".motionBtn");
      for (let i = 0; i < motionBtn.length; i++) {
        motionBtn[i].disabled = true;
      }

      const preview = document.querySelector(".preview");
      if (preview) {
        preview.remove();
      }

      let videoElement
      if (this.mobile) {
        videoElement = document.querySelector(".my-real-video2");
      } else {
        videoElement = document.querySelector(".my-real-video" + useMainStore().option.matchingRoom);
      }
      if (!videoElement) {
        console.warn("실제 카메라 비디오 요소를 찾을 수 없습니다.");
        return;
      }
      this.prepareVideoElement(videoElement);
      videoElement.style.display = "block";

      this.cleanupAvatarPipeline();
      this.camera = this.createPassiveCamera(videoElement);
      this.camera.start();

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
      let p = document.createElement("p");
      let p2 = document.createElement("p");
      p.innerHTML = `${this.time} : <span style="color:red;">${text}</span> 은(는) 어떠신가요?`;
      p2.innerHTML =  `${this.time} : <span style="color:red;">${text}</span> 은(는) 어떠신가요?`;

      document.querySelector(".keyword-content-mobile").prepend(p);
      document.querySelector(".keyword-content").prepend(p2);
    },
  },
})
