FROM eclipse-temurin:25.0.4_7-jdk-alpine-3.24 AS build
WORKDIR /build
COPY backend/ .
RUN chmod +x mvnw && ./mvnw --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:25.0.4_7-jre-alpine-3.24
RUN addgroup -S -g 10001 app && adduser -S -D -H -u 10001 -G app app
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/our-memories-*.jar app.jar
USER 10001:10001
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -Djava.awt.headless=true"
EXPOSE 8080 9090
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
