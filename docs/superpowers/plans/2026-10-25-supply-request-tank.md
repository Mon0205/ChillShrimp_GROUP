# Supply request destination

Approved requirement: supply requests identify an ao/bể belonging to the selected khu vực.

- [x] Add nullable tank_id FK/index for legacy compatibility; require a tank for new requests.
- [x] Validate farm/area and nondeleted, noninactive tank; area manager cannot choose another area.
- [x] Revalidate destination under row locks during approval before stock changes.
- [x] Add tank selector to both request forms; clear tank when area changes. Use farm API area.id for manager scope.
- [x] Display destination in request list and linked inventory history. Legacy requests without a tank need recreating before approval.
- [x] Add regression tests for destination and scope validation.
- [x] Generate client, validate schema, run full backend suite/build, review changes.

No live migration execution. Migration 20261025_005_add_supply_request_tank adds one nullable column, not a table.

Verification: 64 backend tests pass; frontend production build passes (chunk-size advisory); Prisma client generated and schema validated; independent static review found no actionable issues. Live migration not executed.
