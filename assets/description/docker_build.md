# Docker 이미지 빌드 및 tar 생성

Apple Silicon Mac 환경에서 리눅스 AMD64 서버용 이미지를 만들 때는 `--platform linux/amd64` 옵션을 사용합니다.

현재 권장 방식은 `docker buildx build --output type=docker,dest=...` 로 이미지를 바로 `tar` 로 만드는 것입니다.

이 방식은 Docker Desktop에서 간헐적으로 발생하는 image store / snapshot 오류를 피하기 쉽습니다.

중요한 점은 `tar` 파일을 만드는 단계에서는 포트와 환경변수가 이미지 안에 자동으로 고정되지 않는다는 것입니다. 실제 배포 시점에 `docker run -p ... -e ...` 로 직접 넣어줘야 합니다.

특히 백엔드 이미지는 `LIVEKIT_WS_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` 가 없으면 아예 시작하지 않도록 되어 있습니다.

## 프론트엔드

프론트엔드 이미지는 `u-know-me-front` 태그로 빌드하고, 같은 이름으로 `tar`를 저장합니다.

프론트 이미지는 `nginx` 대신 Node 기반 정적 서버로 실행되며, 컨테이너 내부 `3000` 포트에서 `npm start` 로 동작합니다.

```bash
cd FE/u-know-me
docker buildx build --platform linux/amd64 -t u-know-me-front --output type=docker,dest=u-know-me-front.tar .
```

## 백엔드

백엔드 이미지는 MariaDB 초기화 SQL까지 포함한 올인원 이미지입니다.

별도의 DB 이미지를 따로 빌드하지 않고 `u-know-me-back` 이미지 하나만 생성하면 됩니다.

초기 DB 생성 시 아래 테스트 계정도 함께 들어갑니다.

- 남자 테스트 계정: `test / testtest1!`
- 여자 테스트 계정: `test2 / testtest2@`

```bash
cd BE/u-know-me
docker buildx build --platform linux/amd64 -t u-know-me-back --output type=docker,dest=u-know-me-back.tar .
```

## LiveKit Cloud

### 현재 구조

현재 프로젝트는 별도 `livekit-server` 이미지를 배포하는 방식이 아니라 `LiveKit Cloud` 프로젝트에 붙는 방식입니다.

- 프론트: `u-know-me-front`
- 백엔드: `u-know-me-back`
- 미디어 서버: LiveKit Cloud

즉 서버에 올리는 tar는 프론트와 백엔드 2개만 있으면 됩니다.

공식 문서:

- https://docs.livekit.io/intro/basics/cli/projects/
- https://docs.livekit.io/home/cli-setup/
- https://livekit.io/pricing
- https://docs.livekit.io/deploy/admin/quotas-and-limits/

### LiveKit Cloud에서 준비할 값

LiveKit Cloud 프로젝트를 만든 뒤 프로젝트 설정에서 아래 3개를 확인합니다.

- `Project URL`
  - `wss://` 로 시작하는 주소
- `API Key`
- `API Secret`

이 프로젝트는 프론트가 LiveKit secret을 직접 들고 있지 않고, 백엔드가 `/session` API에서 participant token을 발급하는 구조입니다. 그래서 LiveKit 값은 모두 백엔드에만 넣으면 됩니다.

무료 플랜으로 시작할 수는 있지만 quota가 있는 방식입니다. 이 프로젝트 프론트는 LiveKit Cloud quota가 모두 소진되면 채팅 입장 시 모달을 띄우고 `혼자 해보기` 로 유도하도록 되어 있습니다.

### 백엔드 실행 예시

백엔드는 LiveKit Cloud URL과 API 키를 환경변수로 받습니다.

아래 4개 값은 실제 배포 시 반드시 운영 값으로 넣어야 합니다.

- `-p 8888:8080`
- `DB_PASSWORD`
- `LIVEKIT_WS_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

이 값 중 LiveKit 관련 3개가 빠지면 컨테이너는 시작 단계에서 즉시 종료됩니다.

```bash
docker run -d --name u-know-me-back \
  -p 8888:8080 \
  -e DB_PASSWORD=uknowme123! \
  -e LIVEKIT_WS_URL=wss://<LIVEKIT_CLOUD_PROJECT_URL> \
  -e LIVEKIT_API_KEY=<LIVEKIT_CLOUD_API_KEY> \
  -e LIVEKIT_API_SECRET=<LIVEKIT_CLOUD_API_SECRET> \
  u-know-me-back:latest
```

예시:

```bash
docker run -d --name u-know-me-back \
  -p 8888:8080 \
  -e DB_PASSWORD=uknowme123! \
  -e LIVEKIT_WS_URL=wss://example-abc123.livekit.cloud \
  -e LIVEKIT_API_KEY=APIxxxxxxxx \
  -e LIVEKIT_API_SECRET=SECRETxxxxxxxx \
  u-know-me-back:latest
```

Synology 기준 reverse proxy:

- source: `https://uknowme-back.imoneleft.synology.me:443`
- destination: `http://127.0.0.1:8888`

### 프론트 실행 예시

```bash
docker run -d --name u-know-me-front -p 3000:3000 u-know-me-front:latest
```

Synology 기준 reverse proxy:

- source: `https://uknowme.imoneleft.synology.me:443`
- destination: `http://127.0.0.1:3000`

프론트는 백엔드 REST/WebSocket을 `https://uknowme-back.imoneleft.synology.me` / `wss://uknowme-back.imoneleft.synology.me` 로 보고, 채팅 입장 시 백엔드가 내려준 `LIVEKIT_WS_URL` 로 LiveKit Cloud에 직접 붙습니다.

## 기존 방식

로컬 Docker image store가 정상이라면 아래 방식도 사용할 수 있습니다.

```bash
docker build --platform linux/amd64 -t u-know-me-front .
docker save -o u-know-me-front.tar u-know-me-front:latest

docker build --platform linux/amd64 -t u-know-me-back .
docker save -o u-know-me-back.tar u-know-me-back:latest
```

`failed to prepare extraction snapshot` 같은 오류가 나면 위 방식 대신 `buildx --output type=docker,dest=...` 를 사용하는 편이 안전합니다.

## tar 로드

생성한 `tar` 파일은 대상 서버에서 아래처럼 불러올 수 있습니다.

```bash
docker load -i u-know-me-front.tar
docker load -i u-know-me-back.tar
```

## 참고

- LiveKit Cloud를 쓰면 별도 `livekit-server` 컨테이너를 운영하지 않아도 됩니다.
- 프론트는 LiveKit secret을 직접 들고 있지 않고, 백엔드가 `/session` 에서 participant token을 발급합니다.
- LiveKit Cloud quota가 모두 소진되면 프론트에서 `혼자 해보기` 모달을 띄우도록 구현되어 있습니다.
- self-hosted LiveKit을 다시 쓰려면 별도 포트/TURN/TLS 구성을 다시 잡아야 합니다.
