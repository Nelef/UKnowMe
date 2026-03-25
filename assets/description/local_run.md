# 로컬 실행 방법

로컬 실행 시 프론트엔드는 `http://localhost:3000`, 백엔드는 `http://localhost:8080` 기준으로 동작합니다.

로컬 백엔드 실행 전 JDK 8 이상이 설치되어 있어야 합니다.

Windows에서는 아래 명령으로 JDK 8을 설치할 수 있습니다.

```powershell
winget install --id EclipseAdoptium.Temurin.8.JDK -e
```

설치 후 새 터미널을 열어 `java -version` 이 동작하는지 먼저 확인해주세요.

## MariaDB 설치 및 초기화

Windows에서는 아래 명령으로 MariaDB를 설치할 수 있습니다.

```powershell
winget install --id MariaDB.Server -e
```

설치 후 새 터미널을 열고, MariaDB 서비스가 자동 등록되지 않았다면 아래처럼 직접 등록하고 시작합니다.

```powershell
& 'C:\Program Files\MariaDB 12.2\bin\mariadbd.exe' --install MariaDB122 --defaults-file="C:\Program Files\MariaDB 12.2\data\my.ini"
Start-Service MariaDB122
Get-Service MariaDB122
```

설치가 끝나면 아래 스크립트 하나로 DB 생성, 계정 생성, 초기 SQL import까지 한 번에 처리할 수 있습니다.

root 비밀번호가 비어 있는 경우:

```powershell
cd C:\Users\uyeong\Documents\git\UKnowMe
powershell -ExecutionPolicy Bypass -File .\BE\u-know-me\scripts\init-local-db.ps1
```

root 비밀번호가 설정되어 있다면:

```powershell
cd C:\Users\uyeong\Documents\git\UKnowMe
powershell -ExecutionPolicy Bypass -File .\BE\u-know-me\scripts\init-local-db.ps1 -RootPassword "<ROOT_PASSWORD>"
```

이 스크립트는 아래를 한 번에 처리합니다.

- `uknowme` DB 생성
- `uknowme / uknowme123!` 계정 생성
- `docker/mysql/initdb.d` 전체 import
- 테스트 계정 생성

생성되는 테스트 계정:

- 남자 테스트 계정: `test / testtest1!`
- 여자 테스트 계정: `test2 / testtest2@`

## 백엔드

로컬 실행 전 MariaDB가 필요합니다.

채팅 기능까지 확인하려면 LiveKit 연결 정보도 필요합니다.

현재 백엔드는 아래 3개 환경변수가 없으면 시작하지 않습니다.

- `LIVEKIT_WS_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

즉 로컬 `bootRun` 을 하더라도 위 3개는 반드시 넣어야 합니다.

선택지는 2가지입니다.

- 로컬 LiveKit dev 서버를 띄워서 연결
- LiveKit Cloud 프로젝트에 바로 연결

가장 빠른 로컬 테스트는 공식 dev 모드입니다.

```bash
docker run --rm --name livekit-dev -p 7880:7880 -p 7881:7881 livekit/livekit-server:latest --dev
```

LiveKit 공식 dev 모드 기본 키는 아래와 같습니다.

- `LIVEKIT_API_KEY=devkey`
- `LIVEKIT_API_SECRET=secret`
- `LIVEKIT_WS_URL=ws://127.0.0.1:7880`

아래 예시는 로컬 DB + 로컬 LiveKit dev 서버를 사용할 때의 환경 변수 예시입니다.

```bash
cd BE/u-know-me

export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_NAME=uknowme
export DB_USERNAME=uknowme
export DB_PASSWORD=uknowme123!
export LIVEKIT_WS_URL=ws://127.0.0.1:7880
export LIVEKIT_API_KEY=devkey
export LIVEKIT_API_SECRET=secret

./gradlew bootRun
```

Windows PowerShell에서는 아래처럼 실행할 수 있습니다.

```powershell
cd BE\u-know-me

$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_NAME="uknowme"
$env:DB_USERNAME="uknowme"
$env:DB_PASSWORD="uknowme123!"
$env:LIVEKIT_WS_URL="ws://127.0.0.1:7880"
$env:LIVEKIT_API_KEY="devkey"
$env:LIVEKIT_API_SECRET="secret"

.\gradlew.bat bootRun
```

LiveKit Cloud를 바로 사용할 때는 위 dev 값 대신 Cloud 프로젝트 값을 넣으면 됩니다.

```bash
export LIVEKIT_WS_URL=wss://<LIVEKIT_CLOUD_PROJECT_URL>
export LIVEKIT_API_KEY=<LIVEKIT_CLOUD_API_KEY>
export LIVEKIT_API_SECRET=<LIVEKIT_CLOUD_API_SECRET>
```

```powershell
$env:LIVEKIT_WS_URL="wss://<LIVEKIT_CLOUD_PROJECT_URL>"
$env:LIVEKIT_API_KEY="<LIVEKIT_CLOUD_API_KEY>"
$env:LIVEKIT_API_SECRET="<LIVEKIT_CLOUD_API_SECRET>"
```

## 프론트엔드

프론트엔드는 개발 서버 기준으로 백엔드 `http://localhost:8080` 과 웹소켓 `ws://localhost:8080` 을 바라보도록 설정되어 있습니다.

```bash
cd FE/u-know-me
npm install
npm run serve
```

브라우저에서 `http://localhost:3000` 으로 접속하면 됩니다.

## 참고

- 소셜 로그인 콜백은 로컬 기준으로 백엔드 `http://localhost:8080/member/oauth2/code/{provider}` 를 사용합니다.
- LiveKit URL과 API 키는 프론트가 아니라 백엔드 환경변수 `LIVEKIT_WS_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` 로 관리합니다.
- 위 3개 LiveKit 환경변수가 빠지면 로컬 `bootRun` 도 시작하지 않습니다.
- 로컬에서 `http://localhost:3000` 으로 접속해도 브라우저 secure context 제약 때문에 다른 기기 LAN HTTP 접속에서는 카메라/마이크 권한이 막힐 수 있습니다.
- 공개 배포용 LiveKit 최소 포트 구성은 `./docker_build.md` 를 참고하면 됩니다.
- Docker `tar` 배포용 프론트는 `3000` 포트에서 `npm start` 로 실행되며, 기본 API/웹소켓 주소는 `https://uknowme-back.imoneleft.synology.me` / `wss://uknowme-back.imoneleft.synology.me` 입니다.
