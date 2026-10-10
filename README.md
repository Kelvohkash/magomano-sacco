# Magomano SACCO

Member portal built with React, Vite, Cloudflare Pages Functions, and Cloudflare D1. The Pages Functions provide the `/api/*` endpoints used by registration, sign-in, member accounts, and the admin portal.

## Project layout

- `src/App.tsx` coordinates authentication state, session restoration, and screen selection.
- `src/components/` contains the auth, member, and admin portal views.
- `src/types.ts` and `src/format.ts` hold shared client models and display formatting.
- `functions/api/[[path]].js` implements the API using the `DB` D1 binding.
- `migrations/` contains versioned D1 schema migrations.
- `wrangler.jsonc` binds the existing `magomano-db` database.

## Cloudflare deployment

This repository is connected to the `magomano-sacco` Cloudflare Pages project on the `master` branch. Pushing changes to `master` triggers the Pages build and deployment. The D1 database is `magomano-db` and the binding name is `DB`.

## Install the app

Magomano SACCO is an installable Progressive Web App. On desktop, open the deployed HTTPS site in Chrome or Edge and use the install icon in the address bar (or the browser menu's **Install Magomano SACCO** action). On Android, use the browser menu's **Install app** or **Add to Home screen** action. On iPhone or iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**.

The app shell and static assets are cached for offline startup. Account requests and API responses are not cached; signing in and viewing or changing account data still require a connection.

Apply the migration to the existing remote database before deploying these API changes:

```powershell
npm install
npx wrangler d1 migrations apply magomano-db --remote
```

The migrations use `IF NOT EXISTS` for existing tables and add the missing `loan_applications` and persistent `sessions` tables. The second migration adds administrator roles and links promoted member accounts to their admin identity. Later migrations add statement indexes, member profiles and contacts, administrator-managed terms and conditions, and database-enforced savings-only loan security. Migration `0006` adds full registration details and an immutable snapshot of the terms accepted when a member applies. Existing members, administrators, and password hashes are preserved. Apply and verify migrations before deploying the Pages Function.

Member savings, loan, and repayment statements are fetched from `/api/member/transactions` in pages of 10 records. The API returns each page with its total record count so the portal can show progress and request older entries without loading the full transaction history at once.

Super-admin privileges are configured with Cloudflare Pages secrets. Set a unique super-admin username and strong password in the Pages project before deploying the super-admin feature:

```powershell
npx wrangler pages secret put SUPER_ADMIN_USERNAME --project-name magomano-sacco
npx wrangler pages secret put SUPER_ADMIN_PASSWORD --project-name magomano-sacco
```

Wrangler prompts for each secret without adding its value to the repository. Optionally configure `SUPER_ADMIN_DISPLAY_NAME` as a Pages variable. The first successful super-admin login creates or updates the protected super-admin identity in D1 using the configured username/password. Do not reuse another administrator's or member's username.

Create or update a regular administrator in the existing remote D1 database from PowerShell:

```powershell
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "choose-a-strong-password"
$env:ADMIN_DISPLAY_NAME = "SACCO Admin"
npm run seed:admin
```

To run locally, apply the migration to local D1, then start the Pages Functions runtime and Vite frontend together:

```powershell
npx wrangler d1 migrations apply magomano-db --local
npm run dev
```

Local D1 data is separate from remote D1. Seed a local administrator by setting `$env:ADMIN_D1_LOCAL = "1"` before `npm run seed:admin`. `npm run deploy` builds and deploys the Pages project directly when needed.

For a complete local preview with sample members, transactions, loans, repayments, pending requests, and dividends, run `npm run demo`. It applies local migrations, seeds only local D1, and serves the Cloudflare Pages app at `http://localhost:8788`. Local demo sign-in: admin `demo-admin` / `DemoAdmin-2026!`; approved member `99000101` / `DemoMember-2026!`. These credentials are for local preview only.

To explicitly seed clearly labelled demo records into remote D1, set `ALLOW_REMOTE_DEMO_DATA=1` and run `npm run seed:demo:remote`. This adds sample account balances and pending applications to live SACCO totals and admin queues. The command prints generated, one-time demo login credentials; use them to inspect the live portal, and remove the `DEMO -` accounts and associated records when finished. Do not seed live demo records into a database whose balances or queues are being used as official financial records.

New registrations stay pending until an administrator approves them; members cannot sign in before approval. National IDs accept 6 to 12 digits; any non-empty password is accepted and must be confirmed. Phone numbers accept international prefixes and common separators. Passwords use the existing salted scrypt format, preserving compatibility with existing D1 member and admin accounts. Sessions are stored in D1 as hashed tokens and expire after 12 hours.

The configured super admin can promote member accounts in the **Members** section. A promoted member keeps member access and signs in to **Admin sign in** using their National ID and existing password. Other administrators cannot promote accounts.

Admins can review member registrations and loan applications, record member savings deposits, record loan repayments, and record dividend payments. Members cannot withdraw savings; borrowing is handled through loan applications. The API rejects withdrawal entries, including bulk-import rows. Approving a loan application issues the loan to the member. Repayment entries reduce that loan's outstanding balance; overpayments are rejected.

For monthly posting, use **Bulk statements** in the admin navigation and download the matching CSV template. Savings files require `nationalId,amount,description,date`; every row is a deposit. Repayment files require `loanReference,amount,description,date`, using the issued loan reference shown in the admin repayment list. Dates must be `YYYY-MM-DD`. Uploads show a preview and row-level checks before confirmation; each batch is submitted transactionally to D1, so an invalid row rejects the whole batch. The same normalized file cannot be imported twice. D1 import batches accept up to 400 rows.

Members may request principal only up to their available balance: total savings less active loan balances and amounts already reserved by pending applications. The cap is checked again when an admin approves the loan. The member dashboard and loan application both show this same available balance; loan cards show progress based on principal plus interest repaid against the total repayable amount. Members can open **Loan application status** below **Apply for a loan** to review paginated requests filtered by date, keyword, or status. Pending requests show as received and under review; approval issues the loan immediately and appears as approved and disbursed; rejected requests show as not approved. Savings and loans are separate ledgers: loan issue and repayment operations only update `member_loans` and `loan_repayments`, never `savings_transactions`. Savings balances increase through posted deposits; withdrawals are not supported. Member savings, loan, and repayment statements and admin savings, issued-loan, repayment, dividend, and application histories are paginated and filterable by date and keyword; loan records can also be filtered by status. Each issued loan has a 10% flat interest charge; members choose 1–120 repayment months, and the portal shows the estimated total and monthly installment. The admin overview reports member savings, cumulative loan principal issued, current outstanding balances (shown as outstanding repayments), and dividend payments actually recorded. No dividend payout formula is assumed. Figures are calculated from `savings_transactions`, `member_loans`, and `dividend_payments`. The admin can review requests from `loan_applications` and pending member accounts from `members`.

Applicants can join from the login screen with their National ID, first/second/last names, phone, optional email, county, sub-county, location, one or two bank accounts, and one or two contact persons with relationships. They must accept the current administrator-published terms before an application is created; the accepted text and version are retained for the record. Applications still require administrator approval before sign-in. Administrators can update member names, phone numbers, bank details, location, marital status, and next-of-kin details from the Members section. Members can manage up to two contact persons, each with a relationship and phone number. SACCO terms are authored by an administrator and shown to signed-in members in their account menu. Savings is the only supported loan security; the database rejects alternate security types.

After approval and sign-in, a member dashboard shows their savings balance, outstanding loan balance, up to 10 recent savings entries, and up to 10 issued loans. An account with no ledger entries shows zero totals and empty statements rather than sample figures. The Apply loan menu submits a pending request for SACCO review.

## Scripts

- `npm run dev` starts Vite and the local Pages Functions/D1 runtime.
- `npm run build` type-checks and builds the client.
- `npm run lint` runs Oxlint.
- `npm run seed:admin` creates or updates an administrator in remote D1; set `ADMIN_D1_LOCAL=1` for local D1.
- `npm run deploy` builds and deploys the Pages project.

Dashboard access uses an HTTP-only, same-site session cookie. Identity verification, password reset flows, and rate limiting are not currently included.
