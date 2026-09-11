-- Preserve any legacy scoped memberships created before area assignment existed.
insert into "areas" ("farm_id", "code", "name")
select distinct scoped."farm_id", 'LEGACY', 'Khu vực mặc định'
from (
  select "farm_id" from "farm_members" where "role" in ('area_manager', 'technician') and "area_id" is null
  union
  select "farm_id" from "farm_invitations" where "role" in ('area_manager', 'technician') and "area_id" is null
) scoped
on conflict ("farm_id", "code") do nothing;

update "farm_members" fm
set "area_id" = a."id"
from "areas" a
where a."farm_id" = fm."farm_id"
  and a."code" = 'LEGACY'
  and fm."role" in ('area_manager', 'technician')
  and fm."area_id" is null;

update "farm_invitations" fi
set "area_id" = a."id"
from "areas" a
where a."farm_id" = fi."farm_id"
  and a."code" = 'LEGACY'
  and fi."role" in ('area_manager', 'technician')
  and fi."area_id" is null;

alter table "farm_members" drop constraint if exists "farm_members_area_id_fkey";
alter table "farm_invitations" drop constraint if exists "farm_invitations_area_id_fkey";
alter table "farm_members" add constraint "farm_members_area_id_fkey" foreign key ("area_id") references "areas"("id") on delete restrict;
alter table "farm_invitations" add constraint "farm_invitations_area_id_fkey" foreign key ("area_id") references "areas"("id") on delete restrict;

alter table "farm_members" add constraint "farm_members_role_area_check" check (
  ("role" in ('area_manager', 'technician') and "area_id" is not null)
  or ("role" in ('owner', 'warehouse_staff') and "area_id" is null)
);
alter table "farm_invitations" add constraint "farm_invitations_role_area_check" check (
  ("role" in ('area_manager', 'technician') and "area_id" is not null)
  or ("role" in ('owner', 'warehouse_staff') and "area_id" is null)
);
