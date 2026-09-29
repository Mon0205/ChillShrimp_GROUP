alter table "areas"
  add column "status" varchar(20) not null default 'active';

alter table "areas"
  add constraint "areas_status_check"
  check ("status" in ('active', 'inactive'));

create index "areas_farm_id_status_idx" on "areas" ("farm_id", "status");
