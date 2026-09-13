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

The backend and frontend scaffolds include PostgreSQL connectivity, Flyway migrations, and terminal-based account provisioning. Login, MFA, and memory features are not implemented yet.

## Local database

Requires Docker with Linux containers and Docker Compose. From the repository root:

```powershell
Copy-Item .env.example .env
```

Set `POSTGRES_PASSWORD` in `.env` to a unique alphanumeric password before starting the database. Keep this file private. Other PostgreSQL values can retain their defaults.

```powershell
docker compose up -d --wait
docker compose ps
```

PostgreSQL listens only on localhost, using port 5432 by default. Set `POSTGRES_PORT` in `.env` if that port is already in use. Data persists in a named Docker volume. `docker compose down` stops and removes the container while preserving that volume; adding `--volumes` deletes the database.

These credentials configure a local development database administrator. Production will require separate migration and application roles. Changing credentials in `.env` does not change an already initialized database's credentials.

## Backend

Requires JDK 25 with `JAVA_HOME` configured. The Maven wrapper downloads Maven on its first run. Start the local database before running the application.

From `backend/` on Windows:

```powershell
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

On Linux or macOS, use `./mvnw` instead of `.\mvnw.cmd`.

The server starts on port 8080. No API endpoints are defined yet, so requests to `/` return HTTP 404. Stop the server with Ctrl+C.

The `local` profile reads `.env` from the repository root when launched from `backend/`. Other environments supply database settings through environment variables.

Flyway applies versioned SQL migrations at startup. The first migration creates the `capsule` schema; Flyway tracks migrations in `public.flyway_schema_history`. Hibernate validates the schema and never creates or updates it. Add new migrations rather than editing ones already applied.

`verify` requires a running Docker engine and creates an isolated PostgreSQL container through Testcontainers. It checks startup migrations and repeat migration behavior, without using `.env` or the development database, and produces an executable JAR in `backend/target/`.

## Provisioning accounts

Build the backend, then run this from `backend/` in an interactive terminal with JDK 25:

```powershell
java -jar target/our-first-year-0.0.1-SNAPSHOT.jar --provision-account --spring.profiles.active=local
```

Choose `FIRST` or `SECOND`, enter a username, and enter the password twice. Password input is hidden and is never passed as a command-line argument. Usernames are case-insensitive, 3–32 characters, and allow letters, digits, dots, underscores, and hyphens, starting with a letter or digit. Passwords must be 15–128 characters.

Each slot can hold one account; neither slot grants additional permissions. Duplicate usernames and occupied slots are rejected. The database enforces the same two-account limit. Passwords are stored as salted Argon2id hashes.

The command exits after provisioning and does not start a web server. There is no registration endpoint. Login and MFA enrollment will be added separately; provisioned accounts cannot log in yet.

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

## Continuous integration

GitHub Actions runs on pull requests, pushes to `main`, and manual dispatch. The backend job uses Java 25 to validate the Compose configuration, run PostgreSQL integration tests through Testcontainers, and package the application. The frontend job uses Node.js 24 to install locked dependencies, lint, type-check, and build.

The jobs run independently and cache downloaded dependencies. No project secrets or development database are required. The workflow becomes active when this repository is hosted on GitHub with Actions enabled.
