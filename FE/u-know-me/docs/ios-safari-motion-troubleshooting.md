# iOS Safari 모션 인식 트러블슈팅

기준 커밋: `113b34a` `iOS 사파리 모션 입력 비디오 경로를 보정`

## 증상

- iOS Safari에서 카메라 UI는 계속 움직이는데, 모션 인식은 첫 얼굴 위치 근처에 고정된 것처럼 보일 수 있었다.
- 이때 화면의 `얼굴 인식됨` 상태가 유지되거나, 얼굴 좌표가 사실상 갱신되지 않는 증상이 있었다.
- 같은 세션에서 `모션 새로고침`을 누르면 다시 정상 동작하는 경우가 많았다.

## 현재 구조

- 모션 파이프라인은 대략 `camera stream -> tracking video -> MediaPipe -> Kalidokit -> VRM -> canvas captureStream -> LiveKit publish` 순서다.
- 사용자가 보는 프리뷰와 추론 입력은 같은 엘리먼트가 아니다.
  - 추론 입력: `.tracking-primary-video`
  - 디버그 프리뷰: `.tracking-debug-video`

즉, 프리뷰가 실시간으로 보인다고 해서 추론 입력도 정상 프레임을 계속 받고 있다고 볼 수는 없다.

## 확인한 사실

### 1. 현재 Safari는 legacy Holistic 경로를 쓰지 않는다

- 현재 코드에서 `ENABLE_LEGACY_SAFARI_HOLISTIC_RUNTIME = false` 이다.
- 따라서 Safari도 기본적으로 `@mediapipe/tasks-vision`의 `HolisticLandmarker.detectForVideo()` 경로를 사용한다.
- 과거에 legacy `@mediapipe/holistic` 경로를 실험했지만, 현재 운영 판단은 아니다.

### 2. 문제는 카메라 정지보다 추론 입력 video 쪽일 가능성이 높다

- 디버그 프리뷰는 `sourceVideoElement.srcObject`를 별도 `.tracking-debug-video`에 붙여 재생한다.
- 반면 모션 추론은 숨겨진 `.tracking-primary-video`를 기준으로 돈다.
- 따라서 화면상 카메라가 움직여도, 추론 입력 video가 Safari에서 실제 프레임을 계속 내지 못하면 얼굴 좌표는 멈춘 것처럼 보일 수 있다.

### 3. `currentTime` 기반 스킵이 Safari에서 문제를 증폭시킬 수 있었다

- 추론 루프는 기본적으로 `currentVideoTime === lastHolisticVideoTime`이면 프레임을 스킵한다.
- Safari에서 추론 입력 video의 `currentTime` 갱신이 꼬이면, 이후 detect loop가 계속 건너뛰어질 수 있다.
- 이 경우 마지막 성공 결과가 남아서 `얼굴 인식됨` 상태가 계속 유지될 수 있다.

### 4. “숨겨진 tracking video” 자체가 Safari에서 리스크였다

- 기존 `.tracking-preview-hidden`은 `1px x 1px`, `opacity: 0` 상태였다.
- 거기에 실제 입력 video까지 `visibility: hidden`으로 유지되고 있었다.
- Safari에서는 이런 offscreen/hidden video가 프레임 갱신 대상에서 불안정해질 가능성이 높다고 판단했다.

### 5. 수동 새로고침이 잘 되는 이유는 모델보다 입력 상태를 다시 세우기 때문이다

- `모션 새로고침`은 카메라/추론 세션을 다시 초기화하고 `startHolistic()`를 다시 탄다.
- 따라서 수동 새로고침 성공은 “Safari는 반드시 legacy 모델을 써야 한다”보다 “초기 시작 시 추론 입력 video 상태가 꼬인다”는 가설과 더 잘 맞는다.

## 시도했지만 현재 결론으로 채택하지 않은 내용

### 1. Safari는 무조건 legacy `@mediapipe/holistic`을 써야 한다

- 한때 이 경로를 붙여서 테스트했지만, 현재 코드 기준 기본 판단은 아니다.
- legacy 경로는 실험용/폴백 성격으로만 남아 있었고, 현재는 비활성화 상태다.
- 따라서 이 문서에서는 legacy 경로를 “현재 결정”으로 보지 않는다.

### 2. 손 추적을 끄는 것이 핵심 해결책이다

- Safari에서 손이 더 흔들릴 수는 있지만, 이번 증상의 본질은 “손 인식”보다 “얼굴/포즈 입력 프레임 갱신”에 더 가까웠다.
- 현재 운영 결론을 “Safari는 손을 꺼야 한다”로 정리하지 않는다.

### 3. captureStream 또는 publish 단계가 현재 증상의 1차 원인이다

- Safari에서 capture/publish 계층도 별도 리스크는 있다.
- 다만 이번에 반복된 “첫 얼굴 위치에 고정되는” 문제는 그보다 앞단의 tracking input / detect loop 쪽 설명이 더 강하다.
- 그래서 현 시점 문서에서는 capture/publish를 현재 1차 원인으로 쓰지 않는다.

## 현재까지 반영한 수정

### 1. Safari main-thread Tasks 경로에서 `currentTime` 동일값만으로 detect를 스킵하지 않도록 조정

- iOS Safari + Tasks + main-thread일 때는 `currentTime`이 같아 보여도 detect loop를 막지 않도록 변경했다.
- 목적은 Safari에서 숨겨진 입력 video의 시간값이 고정된 듯 보여도 추론이 완전히 멈추지 않게 하는 것이다.

### 2. Safari의 tracking input wrapper를 1px 숨김 대신 “실제 크기의 투명 레이어”로 변경

- iOS Safari에서는 `.tracking-preview-primary`를 1px 오프스크린 취급이 아니라, 실제 크기를 가진 투명 레이어로 유지한다.
- 목적은 Safari가 추론 입력 video를 계속 렌더 대상처럼 다루게 만드는 것이다.

### 3. Safari에서 실제 tracking input video를 `visibility: visible`로 유지

- 기존에는 추론 입력 video 자체가 `visibility: hidden`이었다.
- 현재는 iOS Safari에서 tracking active 상태라면 입력 video는 `visible`로 두고, 부모 레이어 투명도로만 숨긴다.
- 이게 현재까지 가장 직접적인 수정이다.

## 관련 커밋 메모

- `607e1b9` `iOS 사파리 모션 호환 경로 추가`
  Safari 전용 경로 실험 시작
- `d89b404` `모션 새로고침 UX와 런타임 재로딩 조정`
  수동 새로고침 흐름 정비
- `ea4b003` `사파리에서도 기본 모션 모델을 사용하도록 조정`
  Safari를 다시 기본 Tasks 모델 경로로 복귀
- `113b34a` `iOS 사파리 모션 입력 비디오 경로를 보정`
  tracking input video와 detect loop 쪽 수정

## 현재 남아 있는 가설

아직 기기 실측으로 완전히 닫히지 않은 가설은 아래다.

- Safari 초기 진입 시 `video.play()`는 성공해도, 추론 입력 video가 실제 라이브 프레임을 받기 전 detect loop가 먼저 돈다.
- 수동 새로고침은 사용자 gesture 이후 실행되면서 이 상태를 다시 정상화한다.
- 만약 현재 수정 후에도 동일 증상이 남는다면, 다음 단계는 “detect loop 시작 전에 tracking input video의 프레임이 실제로 한 번 이상 전진했는지 확인하는 대기/계측”을 넣는 것이다.

## 다음 점검 포인트

- iOS Safari에서 초기 입장 직후 `.tracking-primary-video`의 `currentTime`이 실제로 증가하는지 확인
- 첫 detect 직전과 첫 detect 성공 후의 `readyState`, `videoWidth`, `videoHeight`, `currentTime` 로그 비교
- 수동 `모션 새로고침` 전후 같은 항목을 비교해 초기 시작과 무엇이 달라지는지 확인
