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

```bash
cd BE/u-know-me
docker buildx build --platform linux/amd64 -t u-know-me-back --output type=docker,dest=u-know-me-back.tar .
```

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

## tar 실행 예시

프론트와 백엔드를 같은 서버에서 실행할 경우 아래처럼 포트를 매핑하면 됩니다.

```bash
docker run -d --name u-know-me-back -p 8888:8080 u-know-me-back:latest
docker run -d --name u-know-me-front -p 3000:3000 u-know-me-front:latest
```

프론트 tar 이미지는 현재 접속한 호스트의 `3000` 포트에서 서비스되고, 배포용 기본 API/웹소켓 주소는 `https://uknowme-back.imoneleft.synology.me` / `wss://uknowme-back.imoneleft.synology.me` 입니다.

백엔드 tar 이미지를 함께 올리더라도, 프론트가 그 컨테이너를 직접 바라보게 하려면 프론트 production 환경변수를 다시 지정해서 빌드하거나 reverse proxy를 따로 구성해야 합니다.
