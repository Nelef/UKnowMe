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

그다음 PowerShell에서 root 계정으로 접속해서 프로젝트용 DB와 계정을 생성합니다.

root 비밀번호가 비어 있는 설치라면 `--password=` 처럼 빈 비밀번호를 명시하면 됩니다.

```powershell
& 'C:\Program Files\MariaDB 12.2\bin\mariadb.exe' -u root --password=
```

```sql
CREATE DATABASE uknowme CHARACTER SET utf8 COLLATE utf8_general_ci;

CREATE USER 'uknowme'@'localhost' IDENTIFIED BY 'uknowme123!';
CREATE USER 'uknowme'@'127.0.0.1' IDENTIFIED BY 'uknowme123!';

GRANT ALL PRIVILEGES ON uknowme.* TO 'uknowme'@'localhost';
GRANT ALL PRIVILEGES ON uknowme.* TO 'uknowme'@'127.0.0.1';

FLUSH PRIVILEGES;
EXIT;
```

초기 테이블과 데이터 import 명령은 `MariaDB [(none)]>` 프롬프트 안이 아니라 PowerShell에서 실행해야 합니다.

root 비밀번호가 비어 있는 경우:

```powershell
Get-ChildItem 'C:\Users\uyeong\Documents\git\UKnowMe\BE\u-know-me\docker\mysql\initdb.d\*.sql' |
Sort-Object Name |
ForEach-Object {
  Write-Host "Importing $($_.Name)"
  & 'C:\Program Files\MariaDB 12.2\bin\mariadb.exe' -u root --password= uknowme --execute="source $($_.FullName -replace '\\','/')"
}
```

프로젝트 계정 생성 후에는 아래처럼 `uknowme` 계정으로 import 해도 됩니다.

```powershell
Get-ChildItem 'C:\Users\uyeong\Documents\git\UKnowMe\BE\u-know-me\docker\mysql\initdb.d\*.sql' |
Sort-Object Name |
ForEach-Object {
  Write-Host "Importing $($_.Name)"
  & 'C:\Program Files\MariaDB 12.2\bin\mariadb.exe' -u uknowme --password=uknowme123! uknowme --execute="source $($_.FullName -replace '\\','/')"
}
```

## 백엔드

로컬 실행 전 MariaDB가 필요합니다.

채팅 기능까지 확인하려면 LiveKit 서버도 별도로 실행해야 합니다.

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
- 로컬에서 `http://localhost:3000` 으로 접속해도 브라우저 secure context 제약 때문에 다른 기기 LAN HTTP 접속에서는 카메라/마이크 권한이 막힐 수 있습니다.
- 공개 배포용 LiveKit 최소 포트 구성은 `./docker_build.md` 를 참고하면 됩니다.
- Docker `tar` 배포용 프론트는 `3000` 포트에서 `npm start` 로 실행되며, 기본 API/웹소켓 주소는 `https://uknowme-back.imoneleft.synology.me` / `wss://uknowme-back.imoneleft.synology.me` 입니다.
