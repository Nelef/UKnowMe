# Docker 이미지 빌드 및 tar 생성

Apple Silicon Mac 환경에서 리눅스 AMD64 서버용 이미지를 만들 때는 `--platform linux/amd64` 옵션을 사용합니다.

`docker build`로 이미지를 만든 뒤 `docker save`를 실행하면 배포용 `tar` 파일을 만들 수 있습니다.

## 프론트엔드

프론트엔드 이미지는 `u-know-me-front` 태그로 빌드하고, 같은 이름으로 `tar`를 저장합니다.

```bash
cd FE/u-know-me
docker build --platform linux/amd64 -t u-know-me-front .
docker save -o u-know-me-front.tar u-know-me-front:latest
```

## 백엔드

백엔드 이미지는 MariaDB 초기화 SQL까지 포함한 올인원 이미지입니다.

별도의 DB 이미지를 따로 빌드하지 않고 `u-know-me-back` 이미지 하나만 생성하면 됩니다.

```bash
cd BE/u-know-me
docker build --platform linux/amd64 -t u-know-me-back .
docker save -o u-know-me-back.tar u-know-me-back:latest
```

## tar 로드

생성한 `tar` 파일은 대상 서버에서 아래처럼 불러올 수 있습니다.

```bash
docker load -i u-know-me-front.tar
docker load -i u-know-me-back.tar
```
