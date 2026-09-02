create type "FarmRole_new" as enum ('owner', 'area_manager', 'technician', 'warehouse_staff');

alter table "farm_members" alter column "role" drop default;
alter table "farm_members" alter column "role" type "FarmRole_new" using (
  case "role"::text
    when 'owner' then 'owner'
    when 'manager' then 'area_manager'
    when 'staff' then 'technician'
    else 'technician'
  end
)::"FarmRole_new";
alter table "farm_invitations" alter column "role" type "FarmRole_new" using (
  case "role"::text
    when 'owner' then 'owner'
    when 'manager' then 'area_manager'
    when 'staff' then 'technician'
    else 'technician'
  end
)::"FarmRole_new";
drop type "FarmRole";
alter type "FarmRole_new" rename to "FarmRole";
alter table "farm_members" alter column "role" set default 'technician';

create table "areas" (
  "id" uuid primary key default gen_random_uuid(),
  "farm_id" uuid not null references "farms"("id") on delete cascade,
  "code" text not null,
  "name" text not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "areas_farm_id_code_key" unique ("farm_id", "code")
);
create trigger areas_set_updated_at before update on "areas" for each row execute function set_updated_at();

alter table "farm_members" add column "area_id" uuid references "areas"("id") on delete set null;
alter table "farm_invitations" add column "area_id" uuid references "areas"("id") on delete set null;
