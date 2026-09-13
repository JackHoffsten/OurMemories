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

The backend supports PostgreSQL connectivity, Flyway migrations, terminal-based account provisioning, and session authentication with CSRF protection. The frontend remains a welcome page. MFA, login rate limiting, and memory features are not implemented yet; the application is intended for local development at this stage.

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

The server starts on port 8080. Unauthenticated requests to protected endpoints return HTTP 401. Stop the server with Ctrl+C.

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

The command exits after provisioning and does not start a web server. There is no registration endpoint. Provisioned accounts can authenticate through the API; MFA enrollment and the login interface are not implemented yet.

## Authentication API

The API uses a server-side session and a `JSESSIONID` cookie. Clients must retain cookies between requests.

1. `GET /api/auth/csrf` returns `headerName` and `token`. Send the token in the named header on every POST, PUT, PATCH, and DELETE request, including login and logout.
2. `POST /api/auth/login` accepts `application/x-www-form-urlencoded` fields `username` and `password`. Success returns HTTP 204; invalid credentials return HTTP 401 with no account-specific details. Missing or invalid CSRF tokens return HTTP 403.
3. Fetch a new CSRF token after login. Login changes the session ID and clears the previous token.
4. `GET /api/auth/me` returns the authenticated username or HTTP 401 when logged out.
5. `POST /api/auth/logout` with the current CSRF token invalidates the session and expires its cookie, returning HTTP 204. Fetch another CSRF token before logging in again.

Sessions expire after 30 minutes of inactivity and are lost when the backend restarts. Cookies are HttpOnly, SameSite=Strict, and Secure. The `local` profile disables Secure solely for local HTTP development. Session IDs are never accepted in URLs. Cross-origin access is not enabled; the frontend and API will use the same origin.

With the local backend running, open `http://localhost:8080/api/auth/csrf` to inspect the token response. `http://localhost:8080/api/auth/me` returns HTTP 401 until authenticated. Run `mvnw.cmd verify` to exercise the complete login/logout flow against an isolated database, including invalid credentials, CSRF rejection, and session rotation.

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
