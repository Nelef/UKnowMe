#!/bin/sh
set -eu

APP_HOME="${APP_HOME:-/usr/app}"
ARTIFACT_NAME="${ARTIFACT_NAME:-u-know-me-0.0.1-SNAPSHOT.jar}"
DB_DATA_DIR="${DB_DATA_DIR:-/var/lib/mysql}"
DB_RUN_DIR="${DB_RUN_DIR:-/run/mysqld}"
DB_SOCKET="${DB_SOCKET:-${DB_RUN_DIR}/mysqld.sock}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_BIND_ADDRESS="${DB_BIND_ADDRESS:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-uknowme}"
DB_USERNAME="${DB_USERNAME:-uknowme}"
DB_PASSWORD="${DB_PASSWORD:-uknowme123!}"
DB_DDL_AUTO="${DB_DDL_AUTO:-update}"
FILE_DIRECTORY="${FILE_DIRECTORY:-/opt/download/avatars}"
SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}"

DB_SERVER_BIN="$(command -v mariadbd || command -v mysqld)"
DB_CLIENT_BIN="$(command -v mariadb || command -v mysql)"
DB_ADMIN_BIN="$(command -v mariadb-admin || command -v mysqladmin)"
DB_INSTALL_BIN="$(command -v mariadb-install-db || command -v mysql_install_db)"

DB_PID=""
APP_PID=""

mysql_ready() {
    "$DB_ADMIN_BIN" \
        --protocol=socket \
        --socket="$DB_SOCKET" \
        -uroot \
        ping >/dev/null 2>&1
}

start_db() {
    "$DB_SERVER_BIN" \
        --user=mysql \
        --datadir="$DB_DATA_DIR" \
        --socket="$DB_SOCKET" \
        --pid-file="$DB_RUN_DIR/mysqld.pid" \
        --port="$DB_PORT" \
        --bind-address="$DB_BIND_ADDRESS" \
        --skip-networking=0 \
        --character-set-server=utf8 \
        --collation-server=utf8_general_ci &
    DB_PID=$!
}

wait_for_db() {
    attempt=0
    until mysql_ready; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 60 ]; then
            echo "MariaDB did not become ready in time." >&2
            return 1
        fi
        sleep 1
    done
}

run_init_scripts() {
    for sql_file in /docker-entrypoint-initdb.d/*.sql; do
        if [ ! -f "$sql_file" ]; then
            continue
        fi
        echo "Running init script: $sql_file"
        "$DB_CLIENT_BIN" --protocol=socket --socket="$DB_SOCKET" -uroot "$DB_NAME" < "$sql_file"
    done
}

configure_database() {
    "$DB_CLIENT_BIN" --protocol=socket --socket="$DB_SOCKET" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8 COLLATE utf8_general_ci;
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USERNAME}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USERNAME}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
}

shutdown_db() {
    if [ -n "$DB_PID" ] && kill -0 "$DB_PID" 2>/dev/null; then
        "$DB_ADMIN_BIN" --protocol=socket --socket="$DB_SOCKET" -uroot shutdown >/dev/null 2>&1 || true
        wait "$DB_PID" 2>/dev/null || true
        DB_PID=""
    fi
}

cleanup() {
    if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
        kill "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi
    shutdown_db
}

trap cleanup EXIT INT TERM

mkdir -p "$APP_HOME" "$DB_DATA_DIR" "$DB_RUN_DIR" "$FILE_DIRECTORY"
chown -R mysql:mysql "$DB_DATA_DIR" "$DB_RUN_DIR"

if [ ! -d "${DB_DATA_DIR}/mysql" ]; then
    echo "Initializing MariaDB data directory..."
    "$DB_INSTALL_BIN" --user=mysql --datadir="$DB_DATA_DIR" --auth-root-authentication-method=socket --skip-test-db >/dev/null
    start_db
    wait_for_db
    configure_database
    run_init_scripts
    shutdown_db
fi

echo "Starting MariaDB..."
start_db
wait_for_db

echo "Starting Spring Boot application..."
java \
    -jar "${APP_HOME}/${ARTIFACT_NAME}" \
    --spring.profiles.active="${SPRING_PROFILES_ACTIVE}" \
    --spring.datasource.url="jdbc:mariadb://${DB_HOST}:${DB_PORT}/${DB_NAME}?serverTimezone=UTC&characterEncoding=UTF-8" \
    --spring.datasource.username="${DB_USERNAME}" \
    --spring.datasource.password="${DB_PASSWORD}" \
    --spring.jpa.hibernate.ddl-auto="${DB_DDL_AUTO}" \
    --file.directory="${FILE_DIRECTORY}" &
APP_PID=$!

wait "$APP_PID"
