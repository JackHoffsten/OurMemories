DO $$
BEGIN
    IF current_user = 'ourmemories_migrator'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ourmemories_app') THEN
        GRANT USAGE ON SCHEMA capsule TO ourmemories_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA capsule TO ourmemories_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA capsule TO ourmemories_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA capsule
            GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ourmemories_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA capsule
            GRANT USAGE, SELECT ON SEQUENCES TO ourmemories_app;
    END IF;
END
$$;
