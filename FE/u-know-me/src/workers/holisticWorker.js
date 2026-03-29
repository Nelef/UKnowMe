const PUBLIC_BASE_URL = (process.env.BASE_URL || "/").replace(/\/+$/, "");
const buildPublicAssetUrl = (assetPath) =>
  `${PUBLIC_BASE_URL}/${assetPath}`.replace(/\/{2,}/g, "/");

const TASKS_VISION_WASM_URL = buildPublicAssetUrl("mediapipe/wasm");
const TASKS_VISION_MODULE_URL = buildPublicAssetUrl("mediapipe/vision_bundle.mjs");
const HOLISTIC_LANDMARKER_MODEL_URL = buildPublicAssetUrl(
  "mediapipe/models/holistic_landmarker.task"
);

let tasksVisionModulePromise;
let tasksVisionFilesetPromise;
let holisticLandmarker = null;
let holisticDelegate = "CPU";
let holisticCanvas = null;

const serializeLandmarks = (landmarks) =>
  Array.isArray(landmarks)
    ? landmarks.map((landmark) => ({
        x: landmark?.x ?? null,
        y: landmark?.y ?? null,
        z: landmark?.z ?? null,
        visibility: landmark?.visibility ?? null,
        presence: landmark?.presence ?? null,
      }))
    : null;

const serializeHolisticResult = (result) => ({
  faceLandmarks: serializeLandmarks(result?.faceLandmarks?.[0]),
  poseLandmarks: serializeLandmarks(result?.poseLandmarks?.[0]),
  poseWorldLandmarks: serializeLandmarks(result?.poseWorldLandmarks?.[0]),
  leftHandLandmarks: serializeLandmarks(result?.leftHandLandmarks?.[0]),
  rightHandLandmarks: serializeLandmarks(result?.rightHandLandmarks?.[0]),
});

const loadTasksVisionModule = async () => {
  if (!tasksVisionModulePromise) {
    tasksVisionModulePromise = import(
      /* webpackIgnore: true */ TASKS_VISION_MODULE_URL
    );
  }

  return tasksVisionModulePromise;
};

const closeHolisticLandmarker = () => {
  if (!holisticLandmarker) {
    holisticCanvas = null;
    return;
  }

  try {
    holisticLandmarker.close();
  } catch (error) {
    console.warn("Holistic worker landmarker 종료 중 오류가 발생했습니다.", error);
  }

  holisticLandmarker = null;
  holisticCanvas = null;
};

const createGpuCanvas = (width, height) => {
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("OffscreenCanvas를 지원하지 않아 워커 GPU를 사용할 수 없습니다.");
  }

  const canvas = new OffscreenCanvas(
    Math.max(1, Number(width) || 1),
    Math.max(1, Number(height) || 1)
  );
  const context = canvas.getContext("webgl2");

  if (!context) {
    throw new Error("WebGL2 컨텍스트를 만들 수 없어 워커 GPU를 사용할 수 없습니다.");
  }

  return canvas;
};

const initHolisticLandmarker = async (payload = {}) => {
  const {
    minConfidence = 0.45,
    forceRecreate = false,
    delegate = "CPU",
    canvasWidth = 1,
    canvasHeight = 1,
  } = payload;

  if (
    !forceRecreate &&
    holisticLandmarker &&
    holisticDelegate === delegate
  ) {
    return { delegate: holisticDelegate };
  }

  closeHolisticLandmarker();

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
      delegate,
    },
    runningMode: "VIDEO",
    minFaceDetectionConfidence: minConfidence,
    minFacePresenceConfidence: minConfidence,
    minPoseDetectionConfidence: minConfidence,
    minPosePresenceConfidence: minConfidence,
    minHandLandmarksConfidence: minConfidence,
    outputFaceBlendshapes: false,
    outputPoseSegmentationMasks: false,
  };

  if (delegate === "GPU") {
    holisticCanvas = createGpuCanvas(canvasWidth, canvasHeight);
    taskOptions.canvas = holisticCanvas;
  } else {
    holisticCanvas = null;
  }

  holisticLandmarker = await HolisticLandmarker.createFromOptions(
    wasmFileset,
    taskOptions
  );

  holisticDelegate = delegate;

  return { delegate: holisticDelegate };
};

const detectHolistic = async (payload = {}) => {
  const { frame, timestampMs } = payload;

  if (!holisticLandmarker) {
    throw new Error("Holistic worker가 초기화되지 않았습니다.");
  }

  if (!frame) {
    throw new Error("Holistic worker 입력 프레임이 없습니다.");
  }

  try {
    const result = holisticLandmarker.detectForVideo(frame, timestampMs);
    return serializeHolisticResult(result);
  } finally {
    frame.close?.();
  }
};

const disposeHolistic = async () => {
  closeHolisticLandmarker();
  return { closed: true };
};

self.addEventListener("message", async (event) => {
  const { requestId, type, payload } = event.data || {};

  try {
    let responsePayload;

    if (type === "init") {
      responsePayload = await initHolisticLandmarker(payload);
    } else if (type === "detect") {
      responsePayload = await detectHolistic(payload);
    } else if (type === "dispose") {
      responsePayload = await disposeHolistic();
    } else {
      throw new Error(`지원하지 않는 worker 요청입니다: ${type}`);
    }

    self.postMessage({
      requestId,
      ok: true,
      payload: responsePayload,
    });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: {
        message: error?.message || String(error),
      },
    });
  }
});
