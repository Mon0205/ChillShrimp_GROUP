update "farm_invitations"
set "expires_at" = least("expires_at", "created_at" + interval '1 day')
where "status" = 'pending';
