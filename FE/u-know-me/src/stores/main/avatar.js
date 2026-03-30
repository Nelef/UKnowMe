import { defineStore } from 'pinia'
import * as THREE from "three";
import * as GLTF from "three/examples/jsm/loaders/GLTFLoader";
import * as VRMUtils from "@pixiv/three-vrm";
import { useAccountStore } from '../land/account';

const MAIN_AVATAR_RENDER_PIXEL_RATIO = 1;
const MAIN_AUTO_VIEW_CYCLE_MS = 11000;
const MAIN_AUTO_VIEW_RESUME_MS = 2800;
const MAIN_MODEL_BASE_ROTATION_Y = Math.PI;
const MAIN_MODEL_YAW_START = THREE.MathUtils.degToRad(-57);
const MAIN_MODEL_YAW_END = THREE.MathUtils.degToRad(23);
const MAIN_MODEL_PITCH_START = THREE.MathUtils.degToRad(-2);
const MAIN_MODEL_PITCH_END = THREE.MathUtils.degToRad(6);
const MAIN_MODEL_PITCH_MIN = THREE.MathUtils.degToRad(-16);
const MAIN_MODEL_PITCH_MAX = THREE.MathUtils.degToRad(14);
const MAIN_MODEL_ROTATION_DAMPING = 5.5;

const isAppleTouchDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const getMainAvatarPixelRatio = () =>
  isAppleTouchDevice() ? 0.9 : MAIN_AVATAR_RENDER_PIXEL_RATIO;

export const useAvatarStore = defineStore('avatar', {
  state: () => ({
    avatarMan: [
      { id: 11, name: '유노', image: require('@/assets/main/boy1.png') },
      { id: 12, name: '보디다르마', image: require('@/assets/main/boy2.png') },
      { id: 13, name: '금태양', image: require('@/assets/main/boy3.png') },
      { id: 14, name: '클라디우스', image: require('@/assets/main/boy4.png') },
      { id: 15, name: '키츠네', image: require('@/assets/main/boy5.png') },
      { id: 16, name: '블랙', image: require('@/assets/main/boy6.png') },
    ],
    avatarWoman: [
      { id: 21, name: '미', image: require('@/assets/main/girl1.png') },
      { id: 22, name: '마땡이', image: require('@/assets/main/girl2.png') },
      { id: 23, name: '유미', image: require('@/assets/main/girl3.png') },
      { id: 24, name: '홍찌', image: require('@/assets/main/girl4.png') },
      { id: 25, name: '보리', image: require('@/assets/main/girl5.png') },
      { id: 26, name: '도레미', image: require('@/assets/main/girl6.png') },
    ],
    avatarProgress: 0,
    avatarLoading: false,
    avatarLoadingLabel: "모델 다운로드 중",
    renderer: null,
    orbitControls: null,
    orbitCamera: null,
    scene: null,
    currentVrm: null,
    animationFrameId: null,
    blinkIntervalId: null,
    resizeHandler: null,
    visibilityHandler: null,
    resizeObserver: null,
    interactionCleanup: null,
    loadRequestId: 0,
  }),
  getters: {

  },
  actions: {
    clearRenderer() {
      this.avatarLoading = false;
      this.avatarLoadingLabel = "모델 다운로드 중";
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      if (this.blinkIntervalId) {
        clearInterval(this.blinkIntervalId);
        this.blinkIntervalId = null;
      }

      if (this.resizeHandler) {
        window.removeEventListener("resize", this.resizeHandler);
        this.resizeHandler = null;
      }

      if (this.visibilityHandler) {
        document.removeEventListener("visibilitychange", this.visibilityHandler);
        this.visibilityHandler = null;
      }

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      if (this.interactionCleanup) {
        this.interactionCleanup();
        this.interactionCleanup = null;
      }

      if (this.currentVrm?.scene?.parent) {
        this.currentVrm.scene.parent.remove(this.currentVrm.scene);
      }
      this.currentVrm = null;
      this.orbitControls = null;

      if (this.renderer) {
        this.renderer.dispose();
        if (typeof this.renderer.forceContextLoss === "function") {
          this.renderer.forceContextLoss();
        }
        const canvas = this.renderer.domElement;
        if (canvas?.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        this.renderer = null;
      }

      this.scene = null;
      this.orbitCamera = null;
    },
    load(id, options = {}) {
      const { persist = true } = options;
      const account = useAccountStore();
      const resolvedAvatarId = id;

      if (persist) {
        const idJson = { avatarSeq: resolvedAvatarId };
        account.changeAvatar(idJson);

        if (account.currentUser?.avatar) {
          account.currentUser.avatar.seq = resolvedAvatarId;
        }
      }

      this.loadRequestId += 1;
      const loadRequestId = this.loadRequestId;
      this.avatarProgress = 0;
      this.avatarLoading = true;
      this.avatarLoadingLabel = "모델 다운로드 중";
      this.clearRenderer();
      this.avatarLoading = true;
      this.avatarLoadingLabel = "모델 다운로드 중";

      const avatarContainer = document.getElementById("nowAvatarDiv");
      if (!avatarContainer) {
        console.warn("nowAvatarDiv를 찾지 못해 아바타 로드를 건너뜁니다.");
        this.avatarLoading = false;
        return;
      }

      const scene = new THREE.Scene();
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      const getRenderSize = () => {
        const rect = avatarContainer.getBoundingClientRect();
        return {
          width: Math.max(1, Math.round(rect.width || window.innerWidth)),
          height: Math.max(1, Math.round(rect.height || window.innerHeight)),
        };
      };
      const initialSize = getRenderSize();
      renderer.setSize(initialSize.width, initialSize.height, false);
      renderer.setPixelRatio(getMainAvatarPixelRatio());
      renderer.domElement.id = "nowAvatar";
      renderer.domElement.style.touchAction = "none";

      avatarContainer.append(renderer.domElement);

      // camera
      const orbitCamera = new THREE.PerspectiveCamera(
        75,
        initialSize.width / initialSize.height,
        0.1,
        1000
      );
      orbitCamera.position.set(0.0, 1.4, 0.7);

      // window resize
      const resizeHandler = () => {
        const size = getRenderSize();
        orbitCamera.aspect = size.width / size.height;
        orbitCamera.updateProjectionMatrix();
        renderer.setSize(size.width, size.height, false);
        renderer.setPixelRatio(getMainAvatarPixelRatio());
      };
      window.addEventListener("resize", resizeHandler);

      let autoViewStartedAt = performance.now();
      let autoViewResumeAt = 0;
      let autoViewInteracting = false;
      let autoViewEnabled = false;
      let currentYaw = MAIN_MODEL_YAW_START;
      let currentPitch = MAIN_MODEL_PITCH_START;
      let targetYaw = MAIN_MODEL_YAW_START;
      let targetPitch = MAIN_MODEL_PITCH_START;
      const applyModelRotation = () => {
        if (!this.currentVrm?.scene) {
          return;
        }
        this.currentVrm.scene.rotation.set(
          currentPitch,
          MAIN_MODEL_BASE_ROTATION_Y + currentYaw,
          0
        );
      };
      const updateAutoTargets = (now = performance.now()) => {
        const cycleProgress =
          ((now - autoViewStartedAt) % MAIN_AUTO_VIEW_CYCLE_MS) /
          MAIN_AUTO_VIEW_CYCLE_MS;
        const loopT = 0.5 - 0.5 * Math.cos(cycleProgress * Math.PI * 2);
        targetYaw = THREE.MathUtils.lerp(
          MAIN_MODEL_YAW_START,
          MAIN_MODEL_YAW_END,
          loopT
        );
        targetPitch = THREE.MathUtils.lerp(
          MAIN_MODEL_PITCH_START,
          MAIN_MODEL_PITCH_END,
          loopT
        );
      };
      const syncAutoViewFromRotation = () => {
        const yawSpan = MAIN_MODEL_YAW_END - MAIN_MODEL_YAW_START;
        if (Math.abs(yawSpan) < 1e-4) {
          return;
        }

        const yawT = THREE.MathUtils.clamp(
          (currentYaw - MAIN_MODEL_YAW_START) / yawSpan,
          0,
          1
        );
        const loopT = Math.acos(1 - 2 * yawT) / Math.PI;
        autoViewStartedAt =
          performance.now() - loopT * MAIN_AUTO_VIEW_CYCLE_MS;
      };
      const updateRotationTowardsTarget = (deltaSeconds) => {
        const dampingFactor = 1 - Math.exp(-MAIN_MODEL_ROTATION_DAMPING * deltaSeconds);
        currentYaw = THREE.MathUtils.lerp(currentYaw, targetYaw, dampingFactor);
        currentPitch = THREE.MathUtils.lerp(currentPitch, targetPitch, dampingFactor);
        applyModelRotation();
      };

      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartYaw = currentYaw;
      let dragStartPitch = currentPitch;
      let activePointerId = null;

      const onPointerDown = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        autoViewInteracting = true;
        autoViewResumeAt = performance.now() + MAIN_AUTO_VIEW_RESUME_MS;
        activePointerId = event.pointerId;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        dragStartYaw = currentYaw;
        dragStartPitch = currentPitch;
        renderer.domElement.setPointerCapture?.(event.pointerId);
      };
      const onPointerMove = (event) => {
        if (activePointerId !== event.pointerId) {
          return;
        }

        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;
        const yawRange = MAIN_MODEL_YAW_END - MAIN_MODEL_YAW_START;
        const pitchRange = MAIN_MODEL_PITCH_MAX - MAIN_MODEL_PITCH_MIN;

        currentYaw = THREE.MathUtils.clamp(
          dragStartYaw + (deltaX / Math.max(160, initialSize.width)) * yawRange,
          MAIN_MODEL_YAW_START,
          MAIN_MODEL_YAW_END
        );
        currentPitch = THREE.MathUtils.clamp(
          dragStartPitch + (deltaY / Math.max(160, initialSize.height)) * pitchRange,
          MAIN_MODEL_PITCH_MIN,
          MAIN_MODEL_PITCH_MAX
        );
        targetYaw = currentYaw;
        targetPitch = currentPitch;
        applyModelRotation();
        autoViewResumeAt = performance.now() + MAIN_AUTO_VIEW_RESUME_MS;
      };
      const endPointerInteraction = (event) => {
        if (activePointerId !== event.pointerId) {
          return;
        }

        autoViewInteracting = false;
        activePointerId = null;
        syncAutoViewFromRotation();
        autoViewResumeAt = performance.now() + MAIN_AUTO_VIEW_RESUME_MS;
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endPointerInteraction);
      window.addEventListener("pointercancel", endPointerInteraction);

      this.interactionCleanup = () => {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", endPointerInteraction);
        window.removeEventListener("pointercancel", endPointerInteraction);
      };

      updateAutoTargets();

      // light
      const light = new THREE.DirectionalLight(0xffffff);
      light.position.set(1.0, 1.0, 1.0).normalize();
      scene.add(light);

      this.scene = scene;
      this.renderer = renderer;
      this.orbitCamera = orbitCamera;
      this.resizeHandler = resizeHandler;
      let lastFrameAt = performance.now();
      this.visibilityHandler = () => {
        if (!document.hidden) {
          lastFrameAt = performance.now();
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);

      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => {
          resizeHandler();
        });
        this.resizeObserver.observe(avatarContainer);
      }

      // Main Render Loop
      const animate = (now = 0) => {
        this.animationFrameId = requestAnimationFrame(animate);

        if (document.hidden) {
          lastFrameAt = now;
          return;
        }

        const autoViewActive =
          autoViewEnabled && !autoViewInteracting && now >= autoViewResumeAt;
        const deltaSeconds = Math.min((now - lastFrameAt) / 1000, 1 / 20);
        lastFrameAt = now;

        if (this.currentVrm) {
          this.currentVrm.update(deltaSeconds);
        }

        if (autoViewActive) {
          updateAutoTargets(now);
        }
        updateRotationTowardsTarget(deltaSeconds);

        renderer.render(scene, orbitCamera);
      };
      animate();

      // Import Character VRM
      const loader = new GLTF.GLTFLoader();
      loader.crossOrigin = "anonymous";
      const updateLoadingState = (progress, label) => {
        if (loadRequestId !== this.loadRequestId) {
          return;
        }

        this.avatarProgress = progress;
        this.avatarLoadingLabel = label;
      };

      // Import model from URL, add your own model here
      loader.load(
        // "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981",
        "vrm/" + resolvedAvatarId + ".vrm",

        (gltf) => {
          if (loadRequestId !== this.loadRequestId) {
            return;
          }

          updateLoadingState(90, "모델 파싱 중");
          VRMUtils.VRMUtils.removeUnnecessaryJoints(gltf.scene);
          updateLoadingState(94, "캐릭터 준비 중");

          VRMUtils.VRM.from(gltf).then((vrm) => {
            if (loadRequestId !== this.loadRequestId) {
              return;
            }

            updateLoadingState(97, "장면 구성 중");
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
            this.currentVrm = vrm;
            autoViewStartedAt = performance.now();
            autoViewResumeAt = 0;
            autoViewInteracting = false;
            autoViewEnabled = true;
            currentYaw = MAIN_MODEL_YAW_START;
            currentPitch = MAIN_MODEL_PITCH_START;
            targetYaw = MAIN_MODEL_YAW_START;
            targetPitch = MAIN_MODEL_PITCH_START;
            applyModelRotation();
            vrm.lookAt.target = orbitCamera; // look camera
            vrm.blendShapeProxy.setValue(VRMUtils.VRMSchema.BlendShapePresetName.Fun, 0.3);
            vrm.blendShapeProxy.setValue(VRMUtils.VRMSchema.BlendShapePresetName.A, 0.4);
            updateLoadingState(99, "마무리 중");
            requestAnimationFrame(() => {
              if (loadRequestId !== this.loadRequestId) {
                return;
              }

              this.avatarProgress = 100;
              this.avatarLoadingLabel = "완료";
              this.avatarLoading = false;
            });
          });
        },

        // for progress tag in HTML 

        //progress 값이 바뀔 때마다
        (progress) => {
          const progressElement = document.getElementById("progress");
          if (progressElement) {
            progressElement.style.color = "#a056ff";
          }

          const downloadRatio =
            progress.total > 0 ? progress.loaded / progress.total : 0;
          updateLoadingState(
            Math.min(88, Math.round(downloadRatio * 88)),
            "모델 다운로드 중"
          );
        },

        (error) => {
          this.avatarLoading = false;
          this.avatarLoadingLabel = "로딩 실패";
          console.error(error);
        }
      )

      const blink = () => {
        if (this.currentVrm?.scene) {
          var vrm = this.currentVrm;
          var blinkValue = vrm.blendShapeProxy.getValue(VRMUtils.VRMSchema.BlendShapePresetName.Blink)
          if (blinkValue === 0) {
            var rand = Math.random()
            if (rand > .9) {
              vrm.blendShapeProxy.setValue('blink', 1)
            }
          } else {
            vrm.blendShapeProxy.setValue(VRMUtils.VRMSchema.BlendShapePresetName.Blink, 0)
          }
          vrm.blendShapeProxy.update()
        }
      };
      this.blinkIntervalId = setInterval(blink, 1000)
    }
  },
})
