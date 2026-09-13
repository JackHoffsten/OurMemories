CREATE TABLE capsule.accounts (
    id UUID PRIMARY KEY,
    username VARCHAR(32) NOT NULL UNIQUE,
    slot VARCHAR(6) NOT NULL UNIQUE CHECK (slot IN ('FIRST', 'SECOND')),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT accounts_username_format CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$')
);
