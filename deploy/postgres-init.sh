#!/bin/sh
set -eu
psql --username postgres --dbname our_memories --set ON_ERROR_STOP=1 <<'SQL'
\set app_password `cat /run/secrets/app_password`
\set migration_password `cat /run/secrets/migration_password`
CREATE ROLE ourmemories_migrator LOGIN PASSWORD :'migration_password';
CREATE ROLE ourmemories_app LOGIN PASSWORD :'app_password';
REVOKE ALL ON DATABASE our_memories FROM PUBLIC;
GRANT CONNECT, CREATE ON DATABASE our_memories TO ourmemories_migrator;
GRANT CONNECT ON DATABASE our_memories TO ourmemories_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO ourmemories_migrator;
SQL
