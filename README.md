# OurMemories

A private digital time capsule for shared memories and photos.

[Getting started](#run-locally) · [Architecture](#architecture) · [Checks](#checks)

## About

OurMemories brings stories, dates, places, and photos together in a shared timeline.
It is a full-stack application with a mobile-friendly React frontend, a Spring Boot
API.

### Features

- Two private accounts with password authentication.
- Create, edit, and delete shared memories with dates and optional locations.
- Search titles, stories, and locations while typing, and sort by date.
- Attach private photos with descriptions.
- Customize the wording, colors, and fonts from frontend configuration files.

### Built with

- **Frontend:** React, TypeScript, and Vite.
- **Backend:** Java 25 LTS, Spring Boot, Spring Security, and Spring Data JPA.
- **Database:** PostgreSQL and Flyway.
- **Delivery:** Docker Compose, Caddy, and Jenkins.

## Architecture

The frontend is organized by feature, with shared API utilities and components.
The backend separates HTTP endpoints, DTOs, service interfaces, and persistence.
Both accounts share the same memories. Photos are stored in PostgreSQL alongside
memory data and are served through authenticated endpoints.

Browser authentication uses server-side sessions, HttpOnly cookies, CSRF protection,
Argon2id password hashes, and login throttling. Flyway applies database migrations;
Hibernate validates the schema. Production uses secure cookies; the local profile
allows HTTP development.

GitHub Actions runs validation on pushes and pull requests. Jenkins tests and builds
commits from `main` before invoking the server's deployment command.

## Requirements

- JDK 25, with `JAVA_HOME` pointing to the JDK installation.
- Node.js 24 LTS, version 24.21.0 or later within version 24, and npm.
- Docker with Linux containers and Docker Compose.
- Git.

## Run locally

### 1. Start PostgreSQL

From the repository root, copy the environment template.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```sh
cp .env.example .env
```

Edit `.env` and replace `POSTGRES_PASSWORD` with a unique alphanumeric password.
Keep the remaining defaults unless you need a different database port. Do not commit `.env`.

```sh
docker compose up -d --wait
```

### 2. Build the backend and create accounts

Open a terminal in `backend`. The Maven wrapper downloads Maven automatically.
Docker must be running for the PostgreSQL integration tests.

**Windows PowerShell:**

```powershell
cd backend
.\mvnw.cmd verify
```

**macOS / Linux:**

```sh
cd backend
sh ./mvnw verify
```

From the same directory, provision an account in an interactive terminal:

```sh
java -jar target/our-memories-0.0.1-SNAPSHOT.jar --provision-account --spring.profiles.active=local
```

Choose `FIRST`, enter a username, and enter a password of 12–128 characters.
Run it again with `SECOND` to create the other account. Password input is hidden;
there is no public registration. Each slot can hold one account.

### 3. Start the backend

From `backend`:

**Windows PowerShell:**

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

**macOS / Linux:**

```sh
sh ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

The local profile reads the repository's `.env`. The API runs at
http://localhost:8080.

### 4. Start the frontend

Open another terminal in the repository root.

**Windows PowerShell:**

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

**macOS / Linux:**

```sh
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173, and sign in.
Vite forwards API requests to the backend. Stop either development server with Ctrl+C.

To stop PostgreSQL, run `docker compose down` from the repository root. Data stays
in its Docker volume. Adding `--volumes` deletes the database. Changing the password
in `.env` does not change an already initialized database's password.

## Project layout

- `frontend/src/app`: application entry and layout.
- `frontend/src/features`: authentication, timeline, memory editor, and image gallery.
- `frontend/src/shared`: shared components and API client.
- `frontend/src/config`: interface text and theme variables.
- `backend/src/main/java`: accounts, security, memories, and image handling.
- `backend/src/main/resources/db/migration`: versioned Flyway migrations.
- `backend/src/test`: backend and PostgreSQL integration tests.
- `deploy`: production Caddy configuration, PostgreSQL initialization, and deployment command.

## Customization

Edit [content.ts](frontend/src/config/content.ts) to change interface text, and
[theme.css](frontend/src/config/theme.css) to change colors and fonts. Fonts are
bundled locally; changing the font family also requires importing the font in
[main.tsx](frontend/src/main.tsx).

## Checks

The backend tests cover authentication, account provisioning, migrations, memory
management, and private images using disposable PostgreSQL containers. Frontend
tests cover the interface and API client using fictional data.

From `backend`:

**Windows PowerShell:**

```powershell
.\mvnw.cmd verify
.\mvnw.cmd spotless:apply
```

**macOS / Linux:**

```sh
sh ./mvnw verify
sh ./mvnw spotless:apply
```

`verify` checks Java formatting, runs tests, and packages the application.
`spotless:apply` formats Java source.

From `frontend`:

**Windows PowerShell:**

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

**macOS / Linux:**

```sh
npm run format:check
npm run lint
npm test
npm run build
```

Use `npm.cmd run format` on Windows or `npm run format` on macOS/Linux to format
frontend code. Production assets are written to `frontend/dist`.

## License

Licensed under the [MIT License](LICENSE).
