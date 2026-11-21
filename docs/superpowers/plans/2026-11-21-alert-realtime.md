# Alert realtime implementation plan

Goal: implement the approved Socket.IO design in the current workspace.
Spec: ../specs/2026-11-21-alert-realtime-design.md
Execution: inline, preserving all existing edits; no commit or branch changes.

- [x] Backend socket: cookie/session authentication, current membership checks, minimal events, session expiry/logout, HTTP server lifecycle. Test real socket delivery with external auth/database doubles.
- [x] Post-commit publication: water-log creation, assignment/claim/status, alert read and personal notification read. Test committed writes and rollback with transaction doubles.
- [x] Frontend shared connection and refresh subscription: 200 ms coalescing, hidden/busy deferral, reconnect, logout and cleanup. Test refresh scheduling and socket lifecycle.
- [x] Integrate bell and alerts page; preserve in-progress notes while refreshing details. Remove both 30-second intervals. Configure Vite/Nginx socket proxy.
- [x] Run backend/frontend suites, frontend build and review the task-only diff against /tmp/chillshrimp-realtime-before.

Review focus: stale area permissions; private recipients; transaction rollback; events during saving; stale requests after changing farms.

## Verification — rechecked 2026-11-21

- Backend: `npm test` — **13 passed, 0 failed**. Tests use real local polling/WebSocket connections and transaction/auth/database doubles.
- Frontend: `npm test` — **9 passed, 0 failed**.
- Chromium: `FE/e2e/alerts-realtime.cjs` — **12 passed, 0 failed**. Runs the real Vue application, Socket.IO server and Vite proxy against an isolated API/Neon/database fixture. No browser runtime errors were captured.
- Frontend: `npm run build` — passed; the existing large-chunk warning remains.
- Nginx: `nginx -t` — passed. A real Socket.IO WebSocket connection through a temporary Nginx instance also passed (test-only port/upstream substituted).
- Real configured database, read only: the exact alert lookup used by socket delivery succeeded; alert-read and assignment-notification tables were accessible.
- Real configured Neon Auth: an anonymous request was rejected with 401 as expected.
- Source and browser checks: no 30-second interval remains in AlertBell or the alerts page; after 31 seconds idle, alert and notification API request counts stayed unchanged.
- Existing CRLF line endings retained; scoped whitespace and JavaScript syntax checks passed.

### Bug found and fixed

If the alert lookup after a committed write failed, the server logged the error but left sockets connected. The frontend could miss that update indefinitely. Delivery now disconnects sockets when this lookup fails; the frontend reconnects and reloads existing APIs. The backend regression test failed before the fix and passed afterwards. Chromium also verified recovery of the missed update while retaining unsaved notes.

### Browser scenarios

Burst coalescing; open-detail refresh preserving notes; events during saving; system and personal reads across tabs; offline/reconnect recovery; recovery after a post-commit lookup failure; switching farms with pending responses; ignoring another farm's events; listener removal on navigation; logout; server-side session expiry; no polling after 31 seconds.

### Reproduce and limits

Run `npm test` inside BE and FE. See `FE/e2e/README.md` for browser setup and commands; fixture: `BE/test-support/realtime-browser-server.mjs`. Test artifacts were absent at the start of this recheck and have been restored/expanded in the repository.

Authenticated login using a real Neon account and writes to the real database were not performed. Service/browser write scenarios use test doubles; the real database checks above are read-only. Multiple backend replicas remain outside the agreed single-process scope.

Work remains uncommitted in the current workspace. Temporary test servers/containers are stopped after verification.
