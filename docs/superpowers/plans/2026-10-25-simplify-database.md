# Simplify database implementation plan

Goal: implement the approved 19-table design from this chat.

Constraints: preserve AI inspections and inventory min_threshold; preserve unrelated workspace edits. Do not apply destructive migrations to a live database without a reviewed deployment step.

- [x] Add regression tests for reduced supplier/batch payloads, direct quantity editing, removed feeding fields and thresholds without document references.
- [x] Remove four Prisma models and their relations; remove approved columns; add a forward migration including removal of the supplier timestamp trigger.
- [x] Remove obsolete endpoints and backend accesses. Keep farm/area authorization, batch lifecycle rules and atomic inventory consumption. Allow owner/area manager to edit current estimated quantity on active batches.
- [x] Simplify supplier/batch forms and details, remove manual quality/growth/quantity-event UI, retain AI inspection UI, and simplify feed reports to actual amounts.
- [x] Update database documentation; validate schema, generate client, run backend suite and frontend production build. Review remaining references and migration safety.

Review focus: cross-farm/area access; editing ended batches; negative/fractional quantities; updating a zero quantity must close the batch and release its tank; no obsolete SQL in feeding reports.

Validation: 46 backend tests passed; frontend production build passed (existing chunk-size advisory); Prisma Client generated; Prisma schema validated. Independent static review found no actionable defects. Forward migration has not been applied to a live database.
