create type "FarmRole" as enum ('owner', 'manager', 'staff', 'viewer');
create type "InvitationStatus" as enum ('pending', 'accepted', 'cancelled');

create table "users" (
  "id" uuid primary key default gen_random_uuid(), "email" text not null unique,
  "username" text unique, "displayName" text, "passwordHash" text, "phone" text,
  "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now()
);
create table "farms" (
  "id" uuid primary key default gen_random_uuid(), "name" text not null check (char_length(trim("name")) between 1 and 120), "address" text,
  "created_by" uuid not null references "users"("id") on delete cascade,
  "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now()
);
create table "farm_members" (
  "farm_id" uuid not null references "farms"("id") on delete cascade, "user_id" uuid not null references "users"("id") on delete cascade,
  "role" "FarmRole" not null default 'viewer', "created_at" timestamptz not null default now(), primary key ("farm_id", "user_id")
);
create table "farm_invitations" (
  "id" uuid primary key default gen_random_uuid(), "farm_id" uuid not null references "farms"("id") on delete cascade,
  "invited_user_id" uuid not null references "users"("id") on delete cascade, "email" text not null, "role" "FarmRole" not null,
  "invited_by" uuid not null references "users"("id"), "token_hash" text not null unique, "expires_at" timestamptz not null,
  "status" "InvitationStatus" not null default 'pending', "created_at" timestamptz not null default now(), "accepted_at" timestamptz
);
create index "farm_invitations_farm_id_email_status_idx" on "farm_invitations"("farm_id", "email", "status");

-- Trigger kỹ thuật: luôn cập nhật updated_at. Nghiệp vụ vẫn nằm trong Express/Prisma.
create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new."updated_at" = now(); return new; end; $$;
create trigger users_set_updated_at before update on "users" for each row execute function set_updated_at();
create trigger farms_set_updated_at before update on "farms" for each row execute function set_updated_at();
