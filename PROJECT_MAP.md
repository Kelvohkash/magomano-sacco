# Project Map

Quick navigation guide for people and AI assistants working in this repository. Start here, then open only the files for the feature being changed.

## Application flow

`src/main.tsx` mounts the React app → `src/App.tsx` owns the top-level session and chooses the auth, member, or admin experience.

- **Authentication:** `src/hooks/useAuthSession.ts` owns session detection, login, registration, terms loading, and logout. `src/components/auth/` renders those flows; registration steps are in `registration/`.
- **Member experience:** `src/hooks/useMemberOperations.ts` owns dashboard loading and loan application submission. `src/components/member/MemberPortal.tsx` routes member views; `views/` contains overview and loan screens. Contacts and accepted terms have dedicated pages.
- **Admin experience:** `src/hooks/useAdminOperations.ts` owns admin data loading and shared form state. Ledger mutations are in `useAdminLedgerOperations.ts`; member/loan review mutations are in `useAdminReviewOperations.ts`. `src/components/admin/AdminPortal.tsx` composes screens and modals; `views/`, `modals/`, and `loan-document/` hold the focused UI.
- **Shared UI:** `src/components/` contains statements, pagination, CSV import UI, and shared presentation components. `src/format.ts` contains display formatting; `src/types.ts` contains frontend domain types.

## API and persistence

The Cloudflare Pages worker routes API requests through `pages-functions/api/[[path]].js`, compiled into `dist/_worker.js`. It normalizes the path, dispatches to the handlers below, and converts errors to JSON.

| Area | Entry point | Feature modules |
| --- | --- | --- |
| Auth and health | `pages-functions/api/_lib/auth.js` | Login, registration, session, terms read, logout |
| Member | `pages-functions/api/_lib/member.js` | `member-dashboard.js`, `member-loans.js`, `member-account.js` |
| Admin | `pages-functions/api/_lib/admin.js` | `admin-overview.js`, `admin-members.js`, `admin-loans.js`, `admin-finances.js`, `admin-imports.js` |
| Shared API | `pages-functions/api/_lib/shared.js` | JSON/errors, request validation, sessions, role checks, cookies, hashing |

All API modules use the D1 binding `env.DB`. Database schema changes belong in ordered `migrations/*.sql` files. `wrangler.jsonc` configures the Pages/D1 project. Local dev server support is in `server/dev.js`.

## Styles and assets

- `src/index.css` is the global entry stylesheet.
- `src/App.css`, `src/Portal.css`, and `src/Admin.css` are ordered import manifests. Their actual rules are under `src/styles/app/`, `src/styles/portal/`, and `src/styles/admin/` respectively.
- Keep import order when moving CSS: later rules may override earlier rules.
- `public/` contains app icons and static assets.

## Common change paths

- Change a member screen → component in `src/components/member/`; data/action behavior → `src/hooks/useMemberOperations.ts` or the matching API module.
- Change an admin screen → `src/components/admin/views/` or its modal/document component; derived filters and modal state → `src/hooks/useAdminPortalState.ts`; mutations/data loading → the matching admin operation hook and API module.
- Change a registration field → `src/types.ts`, `src/components/auth/registration/` (and its parent form), plus `pages-functions/api/_lib/auth.js` validation and the relevant migration if persistence changes.
- Change a financial/admin endpoint → matching `pages-functions/api/_lib/admin-*.js`; check `src/hooks/useAdmin*Operations.ts` for its caller and `src/types.ts` for response shapes.
- Change statement behavior → `src/components/AdminStatementPanel.tsx`, `src/components/StatementFilterPopover.tsx`, `src/components/member/StatementPagination.tsx`, and the relevant admin/member API query.
- Change CSV import → `src/components/BulkImportPanel.tsx`, `src/components/bulk-import/`, `src/components/admin/views/AdminBulkImportView.tsx`, and `pages-functions/api/_lib/admin-imports.js`.
- Change schema/data setup → `migrations/` and, if demo fixtures need to match, `scripts/seed-demo.js`.

## Commands

- `npm run dev` — build and start the local app/server.
- `npm run dev:web` — Vite frontend only.
- `npm run build` — TypeScript project build and production frontend bundle.
- `npm run lint` — Oxlint.
- `npm run demo` — local D1 migrations, demo data, and Pages preview.
- `npm run deploy` — build and deploy to Cloudflare Pages; only run when deployment is requested.

## Navigation tips

- Find API callers: search for `/api/` under `src/`.
- Find endpoint definitions: search for the path or SQL table under `pages-functions/api/_lib/`.
- Find a view's styling: search its class names under `src/styles/`; follow the import manifest to preserve cascade order.
- Before adding a new module, check nearby feature folders and `src/types.ts` for an existing home/type. Keep UI, state, API, and persistence responsibilities in their existing layers.
