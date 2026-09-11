create type "MembershipStatus" as enum ('active', 'suspended');

alter table "farm_members"
add column "status" "MembershipStatus" not null default 'active';
