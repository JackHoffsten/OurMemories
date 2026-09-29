# OurMemories

A private digital time capsule for a couple's shared memories, photos, and letters.

## Planned features

- A chronological timeline with stories, dates, and locations.
- Photo galleries with captions.
- A welcome letter and personal love notes.
- An interactive map of shared memories.
- Two private accounts with password authentication.
- A separate demonstration site using fictional content.

## Technology

- Java 25 LTS, Spring Boot, Spring Security, and Spring Data JPA
- PostgreSQL and Flyway
- React, TypeScript, and Vite
- Docker Compose and Caddy

## Customize the website

Edit [frontend/src/config/content.ts](frontend/src/config/content.ts) for the visible Swedish text, including headings, buttons, messages, and the browser title. Text with a changing memory title or number is a small function in that file.

Edit [frontend/src/config/theme.css](frontend/src/config/theme.css) for colors and fonts. The two favorite colors are at the top. The darker `--color-primary` and `--color-accent` values are used where text needs more contrast; adjust those alongside the favorite colors if you change the palette. Fonts are controlled by `--font-body` and `--font-heading` near the bottom. Changes appear automatically in the local Vite development server. Production changes require a new frontend build and deployment.

## Status

The application supports private sign-in, a shared timeline, and creating, editing, and deleting memories with private images. The backend uses PostgreSQL, Flyway, session authentication, CSRF protection, and login throttling. Production containers and Jenkins deployment configuration are included; server setup and live acceptance checks must be completed before launch.

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
java -jar target/our-memories-0.0.1-SNAPSHOT.jar --provision-account --spring.profiles.active=local
```

Choose `FIRST` or `SECOND`, enter a username, and enter the password twice. Password input is hidden and is never passed as a command-line argument. Usernames are case-insensitive, 3–32 characters, and allow letters, digits, dots, underscores, and hyphens, starting with a letter or digit. Passwords must be 12–128 characters.

Each slot can hold one account; neither slot grants additional permissions. Duplicate usernames and occupied slots are rejected. The database enforces the same two-account limit. Passwords are stored as salted Argon2id hashes.

The command exits after provisioning and does not start a web server. There is no registration endpoint. Provisioned accounts can sign in through the website.

## Authentication API

The API uses a server-side session and a `JSESSIONID` cookie. Clients must retain cookies between requests.

1. `GET /api/auth/csrf` returns `headerName` and `token`. Send the token in the named header on every POST, PUT, PATCH, and DELETE request, including login and logout.
2. `POST /api/auth/login` accepts `application/x-www-form-urlencoded` fields `username` and `password`. Success returns HTTP 204; invalid credentials return HTTP 401 with no account-specific details. Missing or invalid CSRF tokens return HTTP 403.
3. Fetch a new CSRF token after login. Login changes the session ID and clears the previous token.
4. `GET /api/auth/me` returns the authenticated username or HTTP 401 when logged out.
5. `POST /api/auth/logout` with the current CSRF token invalidates the session and expires its cookie, returning HTTP 204. Fetch another CSRF token before logging in again.

Sessions expire after 30 minutes of inactivity and are lost when the backend restarts. Cookies are HttpOnly, SameSite=Strict, and Secure. The `local` profile disables Secure solely for local HTTP development. Session IDs are never accepted in URLs. Cross-origin access is not enabled; the frontend and API will use the same origin.

With the local backend running, open `http://localhost:8080/api/auth/csrf` to inspect the token response. `http://localhost:8080/api/auth/me` returns HTTP 401 until authenticated. Run `mvnw.cmd verify` to exercise the complete login/logout flow against an isolated database, including invalid credentials, CSRF rejection, and session rotation.

## Memories API

Both accounts share the same memories and can create, read, edit, and delete them. All endpoints require a logged-in session; mutations also require the current CSRF token. Text is stored as plain text, not HTML.

- `GET /api/memories?page=0&size=20` returns `items`, `page`, `size`, `totalElements`, and `totalPages`. Pages are zero-based, with 1–100 items per page. Memories are sorted by date descending, then ID descending for a stable order when dates match.
- `GET /api/memories/{id}` returns one memory.
- `POST /api/memories` creates a memory and returns HTTP 201 with its representation and a `Location` header.
- `PUT /api/memories/{id}` replaces its content. Include the `version` returned by the most recent read. A stale version returns HTTP 409; reload the memory before retrying.
- `DELETE /api/memories/{id}` permanently deletes a memory and returns HTTP 204.

POST and PUT accept `application/json`. A fictional creation request:

```json
{
  "title": "Our first walk",
  "story": "We walked by the water and stopped for coffee.",
  "memoryDate": "2026-01-10",
  "locationName": "Stockholm"
}
```

Titles are required and limited to 120 characters; stories are required and limited to 10,000 characters. `memoryDate` is a required calendar date in `YYYY-MM-DD` format, without a timezone. The optional `locationName` accepts up to 200 characters; a blank location clears it. Surrounding whitespace is trimmed. Responses also include `id`, `createdAt`, `updatedAt`, and `version`. Updates use the same content fields plus `version`.

Invalid input returns HTTP 400 and missing memories return HTTP 404. Error bodies use the Problem Details format. The integration tests exercise both accounts sharing memories, pagination, validation, conflicting edits, and authentication/CSRF requirements against disposable PostgreSQL databases.

## Memory images

Both accounts can view and manage images. All endpoints require authentication; uploads and deletions also require CSRF protection.

- `GET /api/memories/{id}/images` lists image metadata in upload order.
- `POST /api/memories/{id}/images` accepts a multipart `file` and returns HTTP 201 with image metadata.
- `GET /api/memories/{id}/images/{imageId}/content` serves the private image with `Cache-Control: no-store`.
- `DELETE /api/memories/{id}/images/{imageId}` permanently removes an image.

Each memory supports 10 JPEG or PNG images, up to 10 MiB and 20 million pixels each. The server checks the actual image format and re-encodes decoded pixels to discard metadata. SVG, GIF, and HEIC are not supported. Images are stored in PostgreSQL alongside the memories, so database backups include them. Deleting a memory deletes its images too.

## Frontend

Requires Node.js 24.21.0 LTS and npm. From `frontend/` on Windows:

```powershell
npm.cmd ci
npm.cmd run dev
```

Keep the backend running with its `local` profile in a separate terminal. Open the local URL printed by Vite (normally `http://localhost:5173`) and sign in with a provisioned account. Vite forwards `/api` requests to `http://localhost:8080`, keeping browser requests on the same origin.

Choose **Lägg till ett minne**, enter a title, date, story, and optional location and images, then save. Selected images have previews and can be removed before saving. Existing images can be opened at full size or permanently deleted after confirmation in the editor. Image deletions take effect immediately. If an upload fails, the saved memory and successful uploads remain; the editor keeps the remaining attachments for another attempt.

The timeline shows 20 memories per page, newest first. Each memory has edit and delete controls; deletion requires confirmation. Conflicting edits preserve the current draft until you choose to reload the saved memory. Drafts stay in memory only and are lost on sign-out or session expiry; they are not saved to browser storage.

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

The build checks TypeScript and creates production assets in `frontend/dist/`. Tests cover the login, timeline, editor, and CSRF client using fictional fixtures. The preview command serves production assets locally. Use the development server while working on the application. On Linux or macOS, use `npm` instead of `npm.cmd`.

## Code style and theme

The colour palette and fonts are defined in `frontend/src/theme.css`. Change its CSS variables to adjust the theme; component styles use those variables instead of individual colour values.

From `frontend/`:

```powershell
npm.cmd run format
npm.cmd run format:check
npm.cmd run lint
npm.cmd run lint:fix
```

Prettier formats TypeScript, JSX, CSS, and frontend configuration. Oxlint checks code quality and React rules; warnings fail the lint check. `.editorconfig` provides consistent indentation and line endings for supporting editors.

From `backend/`, using JDK 25:

```powershell
.\mvnw.cmd spotless:apply
.\mvnw.cmd spotless:check
```

Spotless formats Java with Google Java Format's four-space AOSP style. The normal Maven build checks Java formatting during `validate`; CI also checks frontend formatting. Formatting checks do not modify files.

## Continuous integration

GitHub Actions runs on pull requests, pushes to `main`, and manual dispatch. The backend job uses Java 25 to validate the Compose configuration, run PostgreSQL integration tests through Testcontainers, and package the application. The frontend job uses Node.js 24.21.0 to install locked dependencies, lint, test, type-check, and build.

The jobs run independently and cache downloaded dependencies. No project secrets or development database are required. The workflow becomes active when this repository is hosted on GitHub with Actions enabled.
