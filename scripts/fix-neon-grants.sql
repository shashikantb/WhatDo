-- Neon Postgres permission fix (schema public ownership).
-- Neon provisions databases where the public schema is not owned by the application user by default.
ALTER SCHEMA public OWNER TO whatdo_owner;
GRANT ALL ON SCHEMA public TO whatdo_owner;
GRANT CREATE ON DATABASE whatdo TO whatdo_owner;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO whatdo_owner;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO whatdo_owner;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO whatdo_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO whatdo_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO whatdo_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO whatdo_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO whatdo_owner;
