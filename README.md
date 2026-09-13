# Our First Year

A private digital time capsule for a couple's shared memories, photos, and letters.

## Planned features

- A chronological timeline with stories, dates, and locations.
- Photo galleries with captions.
- A welcome letter and personal love notes.
- An interactive map of shared memories.
- Two private accounts with password and authenticator verification.
- A separate demonstration site using fictional content.

## Technology

- Java 25 LTS, Spring Boot, Spring Security, and Spring Data JPA
- PostgreSQL and Flyway
- React, TypeScript, and Vite
- Docker Compose and Caddy

## Status

The backend and frontend scaffolds are available. Database integration and authentication are not implemented yet.

## Backend

Requires JDK 25 with `JAVA_HOME` configured. The Maven wrapper downloads Maven on its first run.

From `backend/` on Windows:

```powershell
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run
```

On Linux or macOS, use `./mvnw` instead of `.\mvnw.cmd`.

The server starts on port 8080. No API endpoints are defined yet, so requests to `/` return HTTP 404. Stop the server with Ctrl+C.

`verify` runs the application context test and produces an executable JAR in `backend/target/`. No database or environment file is required at this stage.

## Frontend

Requires Node.js 24 LTS and npm. From `frontend/` on Windows:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The frontend currently displays a welcome page and does not call the backend.

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

The build checks TypeScript and creates production assets in `frontend/dist/`. The preview command serves those assets locally. On Linux or macOS, use `npm` instead of `npm.cmd`.
