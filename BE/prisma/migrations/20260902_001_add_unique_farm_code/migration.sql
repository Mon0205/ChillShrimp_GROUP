alter table "farms" add column "code" text;

-- Backfill safely in case farms already exist before this migration.
update "farms"
set "code" = 'FARM-' || upper(substr(replace("id"::text, '-', ''), 1, 8))
where "code" is null;

alter table "farms" alter column "code" set not null;
create unique index "farms_code_key" on "farms"("code");
