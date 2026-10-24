# Supply request decisions

User requirement: Owner/Warehouse Staff see a request list, without per-row approve buttons, and can accept or reject requests in a sensible flow. Area Manager creates requests.

- [x] Restrict creation to Area Manager across middleware, controller and both entry points.
- [x] Restore navigation to requests; open request detail with keyboard/click.
- [x] Add blank processing decision plus required rejection reason in detail; prevent double submits and stale-farm actions.
- [x] Reject pending requests under the same row lock as approval; rejection never touches stock or warehouse transaction history.
- [x] Save processor, processing timestamp and rejection reason via nullable schema additions and forward migration006.
- [x] Regenerate Prisma Client; 35 backend tests pass; UI action self-check passes; independent static review found no actionable defects.
- [x] Final Prisma schema validation and frontend production build pass (chunk-size advisory).

Migration is prepared but not applied to a live database. No browser-based verification was performed.
