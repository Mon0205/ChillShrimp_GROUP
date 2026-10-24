# Inventory approval history

User requirement: remove manual usage entry; record history when warehouse approves a supply request.

- [x] Remove manual usage button/form/API.
- [x] Add owner/warehouse approval with request and stock row locks; atomically decrement stock, create a linked unique transaction, fulfill request.
- [x] Stop care logs from deducting stock or creating a second transaction.
- [x] Add approval UI and read-only history with request area/requester and approver; scope area users to their area.
- [x] Add tests for approval, insufficient stock, role/farm scope, duplicate/concurrent approvals, rollback, and care logs after stock has been issued.
- [x] Generate/validate Prisma, run backend suite and production frontend build, review changes.

Migration adds one nullable unique request link to inventory_transactions; no extra tables. Live migrations are not executed by this change.

Verification: 57 backend tests passed; frontend production build passed with chunk-size advisory; Prisma Client regenerated. Review identified missing request pagination, which was added. Live migration not executed.
