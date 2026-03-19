# 그래들 빌드하는 부분
FROM gradle:7.2.0-jdk-alpine AS TEMP_BUILD_IMAGE
ENV APP_HOME=/usr/app
WORKDIR $APP_HOME
COPY build.gradle settings.gradle $APP_HOME/
  
COPY gradle $APP_HOME/gradle
COPY --chown=gradle:gradle . /home/gradle/src
USER root
RUN chown -R gradle /home/gradle/src

COPY . .
RUN gradle clean build
    
# actual container
FROM eclipse-temurin:8-jre-alpine
ENV ARTIFACT_NAME=u-know-me-0.0.1-SNAPSHOT.jar \
    APP_HOME=/usr/app \
    SPRING_PROFILES_ACTIVE=local \
    DB_HOST=127.0.0.1 \
    DB_BIND_ADDRESS=127.0.0.1 \
    DB_PORT=3306 \
    DB_NAME=uknowme \
    DB_USERNAME=uknowme \
    DB_PASSWORD=uknowme123! \
    DB_DDL_AUTO=update \
    FILE_DIRECTORY=/opt/download/avatars \
    DB_DATA_DIR=/var/lib/mysql \
    DB_RUN_DIR=/run/mysqld

RUN apk add --no-cache mariadb mariadb-client \
    && mkdir -p "$APP_HOME" "$FILE_DIRECTORY" /docker-entrypoint-initdb.d "$DB_RUN_DIR" "$DB_DATA_DIR" \
    && chown -R mysql:mysql "$DB_RUN_DIR" "$DB_DATA_DIR"
    
WORKDIR $APP_HOME
COPY --from=TEMP_BUILD_IMAGE $APP_HOME/build/libs/$ARTIFACT_NAME .
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY docker/mysql/initdb.d/ /docker-entrypoint-initdb.d/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
    
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
