CREATE TABLE "access_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "last_activity" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "access_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "access_sessions_token_hash_key" ON "access_sessions"("token_hash");
CREATE INDEX "access_sessions_user_id_idx" ON "access_sessions"("user_id");
CREATE INDEX "access_sessions_expires_at_idx" ON "access_sessions"("expires_at");
