# Docker 이미지 빌드 및 tar 생성

Apple Silicon Mac 환경에서 리눅스 AMD64 서버용 이미지를 만들 때는 `--platform linux/amd64` 옵션을 사용합니다.

현재 권장 방식은 `docker buildx build --output type=docker,dest=...` 로 이미지를 바로 `tar` 로 만드는 것입니다.

이 방식은 Docker Desktop에서 간헐적으로 발생하는 image store / snapshot 오류를 피하기 쉽습니다.

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

LiveKit은 백엔드 이미지 안에 넣지 않고, 별도 이미지로 운영하는 것을 권장합니다. 현재 프론트는 LiveKit secret을 직접 들고 있지 않고, 백엔드가 `/session` API로 LiveKit participant token을 발급하는 구조입니다.

```bash
cd BE/u-know-me
docker buildx build --platform linux/amd64 -t u-know-me-back --output type=docker,dest=u-know-me-back.tar .
```

## LiveKit

### 권장 구조

이 프로젝트는 LiveKit을 프론트/백엔드와 분리된 별도 서비스로 둡니다.

- 프론트: `u-know-me-front`
- 백엔드: `u-know-me-back`
- 미디어 서버: `livekit-server`

공식 문서:

- https://docs.livekit.io/transport/self-hosting/deployment/
- https://docs.livekit.io/transport/self-hosting/ports-firewall/
- https://docs.livekit.io/frontends/build/authentication/endpoint/

### 최소 포트 구성

이번 프로젝트의 최소 공개 포트 구성은 아래 기준입니다.

- `443/tcp`: `https://livekit.imoneleft.synology.me` -> LiveKit `7880`
- `7881/tcp`: ICE/TCP fallback 용으로 직접 개방

이 구성은 UDP 없이 최대한 붙게 하는 최소 구성입니다. 품질과 연결 성공률은 UDP를 여는 정석 구성보다 떨어질 수 있습니다.

중요한 점은 `443 reverse proxy` 만으로는 부족하다는 것입니다. LiveKit 공식 문서 기준 `7880` 은 API/WebSocket, `7881` 은 UDP가 막혔을 때 쓰는 ICE/TCP fallback 포트입니다. 따라서 `7881/tcp` 는 공유기/NAT/방화벽에서 직접 열어야 합니다.

### LiveKit tar 생성

운영에서는 검증한 버전 태그로 고정하는 편이 좋지만, 예시는 `latest` 를 사용합니다.

```bash
docker pull --platform linux/amd64 livekit/livekit-server:latest
docker save -o livekit-server.tar livekit/livekit-server:latest
```

대상 서버에서:

```bash
docker load -i livekit-server.tar
```

### LiveKit 설정 파일 예시

예를 들어 `/volume1/docker/livekit/livekit.yaml` 파일을 아래처럼 준비합니다.

```yaml
port: 7880
rtc:
  tcp_port: 7881
  use_external_ip: true
keys:
  uknowme: uknowme123
```

이 설정은 최소 포트 기준 예시입니다.

- `port: 7880`: reverse proxy가 붙는 HTTP/WebSocket 포트
- `rtc.tcp_port: 7881`: UDP가 막힌 환경에서 쓰는 TCP fallback 포트
- `keys`: 백엔드 `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` 와 동일해야 함

### LiveKit 실행 예시

```bash
docker run -d --name livekit \
  -p 7880:7880 \
  -p 7881:7881 \
  -v /volume1/docker/livekit/livekit.yaml:/etc/livekit.yaml \
  livekit/livekit-server:latest \
  --config /etc/livekit.yaml
```

Synology 기준 reverse proxy 는 아래처럼 맞추면 됩니다.

- source: `https://livekit.imoneleft.synology.me:443`
- destination: `http://127.0.0.1:7880`

그리고 `7881/tcp` 는 reverse proxy가 아니라 방화벽/NAT에서 직접 열어야 합니다.

### 백엔드 실행 예시

백엔드는 LiveKit URL과 API 키를 환경변수로 받습니다.

```bash
docker run -d --name u-know-me-back \
  -p 8888:8080 \
  -e DB_PASSWORD=uknowme123! \
  -e LIVEKIT_WS_URL=wss://livekit.imoneleft.synology.me \
  -e LIVEKIT_API_KEY=uknowme \
  -e LIVEKIT_API_SECRET=uknowme123 \
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

프론트는 백엔드 REST/WebSocket을 `https://uknowme-back.imoneleft.synology.me` / `wss://uknowme-back.imoneleft.synology.me` 로 보고, 채팅 입장 시 백엔드가 내려준 `LIVEKIT_WS_URL` 로 LiveKit에 직접 붙습니다.

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
docker load -i livekit-server.tar
```

## 참고

- LiveKit 공식 문서 기준 `7880` 은 SSL 종료 가능한 reverse proxy/load balancer 뒤에 두는 포트이고, `7881` 은 UDP가 막혔을 때의 ICE/TCP fallback 포트입니다.
- 최소 포트 구성은 `443/tcp + 7881/tcp` 기준의 타협안입니다. 더 안정적인 운영을 원하면 공식 문서의 UDP/TURN 설정까지 확장하는 편이 좋습니다.
