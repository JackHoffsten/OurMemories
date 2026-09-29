FROM node:24.21.0-alpine AS build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM caddy:2.11.4-alpine
COPY --from=build /build/dist /srv
