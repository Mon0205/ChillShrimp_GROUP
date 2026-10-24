-- Session identity, revocation and cookies are managed by Neon Auth.
-- The API caps each Neon session at createdAt + 24 hours without a second session table.
DROP TABLE "access_sessions";
