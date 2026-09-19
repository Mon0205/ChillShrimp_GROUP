-- Owner may belong to multiple farms. Every other role may belong to one farm only.
create or replace function enforce_farm_membership_scope()
returns trigger
language plpgsql
as $$
begin
  if new."role" <> 'owner' then
    if exists (
      select 1 from "farm_members" fm
      where fm."user_id" = new."user_id"
        and (tg_op = 'INSERT' or (fm."farm_id", fm."user_id") <> (old."farm_id", old."user_id"))
    ) then
      raise exception 'Non-owner users may only belong to one farm.' using errcode = '23514';
    end if;
  else
    if exists (
      select 1 from "farm_members" fm
      where fm."user_id" = new."user_id"
        and fm."role" <> 'owner'
        and (tg_op = 'INSERT' or (fm."farm_id", fm."user_id") <> (old."farm_id", old."user_id"))
    ) then
      raise exception 'A user with a non-owner membership cannot join another farm as Owner.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger farm_members_membership_scope
before insert or update of "user_id", "farm_id", "role" on "farm_members"
for each row execute function enforce_farm_membership_scope();
