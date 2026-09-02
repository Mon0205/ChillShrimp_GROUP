-- Neon Auth owns credentials and sessions in neon_auth.*.
-- public.users becomes the application profile keyed by Neon Auth user id.
alter table "farm_invitations" drop constraint if exists "farm_invitations_invited_user_id_fkey";
alter table "farm_invitations" drop constraint if exists "farm_invitations_invited_by_fkey";
alter table "farm_members" drop constraint if exists "farm_members_user_id_fkey";
alter table "farms" drop constraint if exists "farms_created_by_fkey";

alter table "users" alter column "id" drop default;
alter table "users" alter column "id" type text using "id"::text;
alter table "farms" alter column "created_by" type text using "created_by"::text;
alter table "farm_members" alter column "user_id" type text using "user_id"::text;
alter table "farm_invitations" alter column "invited_user_id" drop not null;
alter table "farm_invitations" alter column "invited_user_id" type text using "invited_user_id"::text;
alter table "farm_invitations" alter column "invited_by" type text using "invited_by"::text;
alter table "users" drop column if exists "passwordHash";

alter table "farms" add constraint "farms_created_by_fkey" foreign key ("created_by") references "users"("id") on delete cascade;
alter table "farm_members" add constraint "farm_members_user_id_fkey" foreign key ("user_id") references "users"("id") on delete cascade;
alter table "farm_invitations" add constraint "farm_invitations_invited_user_id_fkey" foreign key ("invited_user_id") references "users"("id") on delete set null;
alter table "farm_invitations" add constraint "farm_invitations_invited_by_fkey" foreign key ("invited_by") references "users"("id");
