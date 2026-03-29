# iOS Safari 모션 인식 트러블슈팅

## 배경

- 현재 채팅 입장 흐름은 `카메라 입력 -> MediaPipe 추론 -> Kalidokit 리깅 -> VRM 렌더링 -> canvas captureStream -> LiveKit publish` 순서로 구성되어 있다.
- iOS Chrome에서는 현재 구현이 대체로 동작했지만, iOS Safari에서는 아래 문제가 반복됐다.
  - 첫 입장 시 로딩 시작 자체가 안 되는 경우
  - 아바타 캡처가 첫 프레임만 송출되고 멈추는 경우
  - `브라우저 + CPU` 모드에서 손 인식이 불안정하거나 사라지는 경우

## 확인한 사실

### 1. iOS Chrome과 iOS Safari는 둘 다 WebKit이지만 동작은 같지 않다

- 엔진 계층은 같아도 실제 앱의 미디어 정책, autoplay 처리, `srcObject` 연결 시점, canvas 기반 스트림 처리 안정성은 완전히 동일하다고 가정하면 안 된다.
- 특히 Safari 앱은 `video.play()`와 inline/autoplay 흐름에서 더 민감하게 실패했다.

참고:
- https://webkit.org/blog/6784/new-video-policies-for-ios/
- https://webkit.org/blog/7763/a-closer-look-into-webrtc/

### 2. 현재 구현은 최신 Tasks Vision 경로였다

- 우리 구현은 `@mediapipe/tasks-vision`의 `HolisticLandmarker.detectForVideo()`를 사용하고 있었다.
- Kalidokit 공식 예제는 이 경로가 아니라 legacy `@mediapipe/holistic`의 `Holistic.onResults()` + `send()` 흐름을 사용한다.

참고:
- https://github.com/yeemachine/kalidokit
- https://chuoling.github.io/mediapipe/solutions/holistic.html

### 3. Safari에서는 canvas/capture 쪽도 별도 리스크가 있었다

- WebKit에는 `canvas.captureStream()`과 WebGL/canvas 프레임 갱신 관련 이슈가 오래 존재한다.
- 실제로 Safari에서 "첫 화면만 잡히고 이후 프레임이 안 밀리는" 증상은 모션 인식 이전 단계뿐 아니라 publish/capture 단계에서도 재현됐다.

참고:
- https://bugs.webkit.org/show_bug.cgi?id=181663

### 4. 손 추적은 Safari에서 특히 더 보수적으로 보는 게 안전하다

- Kalidokit 예제는 Holistic 기반 손 리깅도 제공하지만, Safari 쪽 안정성은 별개 문제다.
- 이번 트러블슈팅 과정에서는 손이 가장 흔들리는 축이었다.
- 따라서 Safari 전용 경로에서는 손을 과감히 빼고 `얼굴 + 상체`만 유지하는 편이 전체 안정성에 더 유리하다고 판단했다.

참고:
- https://github.com/google-ai-edge/mediapipe/issues/3303

## 시도한 내용

### 1. capture 경로 변경

- WebGL canvas 직접 캡처
- 2D bridge canvas 경유
- 수동 `requestFrame()`
- 고정 FPS `captureStream()`

결과:
- iOS Chrome에서는 일부 조합이 통과했지만, Safari에서는 첫 프레임 고정 문제가 남았다.

### 2. 시작 시점 변경

- Safari에서 사용자 탭 이후 시작하도록 바꿔보기도 했다.
- 미디어 부트 관점에서는 안전했지만, 최종적으로는 제품 흐름상 자동 시작이 더 적합하다고 판단했다.
- 현재는 다시 Safari도 자동 시작이다.

### 3. MediaPipe 런타임 분리

- 기존: 모든 브라우저가 가능한 한 `tasks-vision` 또는 worker 경로 사용
- 현재:
  - iOS Chrome / Android / Desktop: 기존 경로 유지
  - iOS Safari: legacy `@mediapipe/holistic` 경로 사용

## 현재 결정

### iOS Chrome

- 현행 구현 유지
- `tasks-vision` 및 기존 모션 설정 흐름 사용

### iOS Safari

- `브라우저 + CPU` 선택 시 legacy `@mediapipe/holistic` 사용
- Kalidokit은 `Face.solve()` + `Pose.solve()`만 사용
- 손 리깅은 끈다
- worker 경로는 사용하지 않는다
- 세션은 자동 시작한다

## 코드 반영 포인트

- `src/stores/chat/chat.js`
  - Safari 감지
  - Safari 전용 runtime kind 분리
  - legacy Holistic 로더 추가
  - Safari에서 hand 비활성화
- `src/views/chat/ChatView.vue`
  - Safari 자동 시작 유지
- `public/mediapipe/holistic`
  - legacy Holistic 런타임 자산 복사

## 남은 리스크

- Safari에서 face/pose 추적이 살아도, 최종 publish 단계는 별도로 다시 검증해야 한다.
- legacy Holistic 자산 크기가 커서 초기 로드 비용이 증가한다.
- 손을 완전히 끈 상태이므로 Safari에서는 제스처 표현력이 Chrome보다 제한된다.

## 다음에 보면 좋은 지점

- Safari에서 로컬 `test-video`가 실제로 프레임 갱신되는지
- LiveKit publish 직전 트랙이 정상적으로 프레임을 내보내는지
- 필요하면 Safari 전용 저해상도 카메라 프로파일 추가
