param(
    [string]$RootUser = "root",
    [string]$RootPassword = "",
    [string]$DatabaseName = "uknowme",
    [string]$DatabaseUser = "uknowme",
    [string]$DatabasePassword = "uknowme123!",
    [string]$MariaDbExe = ""
)

$ErrorActionPreference = "Stop"

function Resolve-MariaDbExe {
    param([string]$ExplicitPath)

    if ($ExplicitPath) {
        if (-not (Test-Path $ExplicitPath)) {
            throw "MariaDB 실행 파일을 찾을 수 없습니다: $ExplicitPath"
        }
        return (Resolve-Path $ExplicitPath).Path
    }

    $command = Get-Command mariadb.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $candidate = Get-ChildItem "C:\Program Files" -Directory -Filter "MariaDB*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "bin\mariadb.exe" } |
        Where-Object { Test-Path $_ } |
        Select-Object -First 1

    if ($candidate) {
        return $candidate
    }

    throw "mariadb.exe 를 찾을 수 없습니다. PATH를 확인하거나 -MariaDbExe 로 직접 지정하세요."
}

function New-MariaDbArgs {
    param(
        [string]$User,
        [string]$Password,
        [string]$Database = "",
        [string]$Execute = ""
    )

    $args = @("-u", $User, "--password=$Password")

    if ($Database) {
        $args += $Database
    }

    if ($Execute) {
        $args += "--execute=$Execute"
    }

    return $args
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$initDir = Join-Path $scriptDir "..\docker\mysql\initdb.d"
$mariaDb = Resolve-MariaDbExe -ExplicitPath $MariaDbExe

$setupSql = @"
CREATE DATABASE IF NOT EXISTS \`$DatabaseName\` CHARACTER SET utf8 COLLATE utf8_general_ci;
CREATE USER IF NOT EXISTS '$DatabaseUser'@'localhost' IDENTIFIED BY '$DatabasePassword';
CREATE USER IF NOT EXISTS '$DatabaseUser'@'127.0.0.1' IDENTIFIED BY '$DatabasePassword';
GRANT ALL PRIVILEGES ON \`$DatabaseName\`.* TO '$DatabaseUser'@'localhost';
GRANT ALL PRIVILEGES ON \`$DatabaseName\`.* TO '$DatabaseUser'@'127.0.0.1';
FLUSH PRIVILEGES;
"@

Write-Host "MariaDB 실행 파일: $mariaDb"
Write-Host "DB/계정 생성 중..."
& $mariaDb @(New-MariaDbArgs -User $RootUser -Password $RootPassword -Execute $setupSql)

$sqlFiles = Get-ChildItem $initDir -Filter "*.sql" | Sort-Object Name
if (-not $sqlFiles) {
    throw "초기화 SQL 파일을 찾을 수 없습니다: $initDir"
}

foreach ($sqlFile in $sqlFiles) {
    Write-Host "Importing $($sqlFile.Name)"
    $normalizedPath = $sqlFile.FullName -replace "\\", "/"
    & $mariaDb @(New-MariaDbArgs -User $DatabaseUser -Password $DatabasePassword -Database $DatabaseName -Execute "source $normalizedPath")
}

Write-Host ""
Write-Host "초기화 완료"
Write-Host "테스트 계정"
Write-Host "  - test / testtest1!"
Write-Host "  - test2 / testtest2@"
