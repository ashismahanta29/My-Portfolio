# Student Poll setup

The poll is prepared for a Vercel deployment, but it starts in **`NOT_LAUNCHED`**. The server-side `POLL_LAUNCH_ENABLED` flag defaults to off, the database stores `not_launched`, and the public API rejects votes until both the flag is deliberately enabled and an authenticated admin runs `launch`. Deployment by itself cannot launch it. The website does not store votes in the browser. Vercel's `/api/poll` function talks to Supabase using a server-only service key.

## Files

- `api/poll.js` is the Vercel serverless API for public poll status, vote submission, and protected admin actions.
- `poll-database.sql` creates the poll, vote, and short-window rate-limit tables plus the atomic vote and admin-transition functions. In the Supabase SQL Editor setup, both `SECURITY DEFINER` functions are owned by `postgres`; their execution is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted to `service_role`. Client roles are denied direct table access by grants and restrictive RLS policies.
- `student-poll.html`, `student-poll.css`, and `student-poll.js` provide the poll page and interface. It shows an inactive message and no choices until launch.
- `index.html` contains the delayed home prompt. `poll-nav.js` reveals the hidden poll link only after the server reports a launched state; while the server cannot confirm launch, it stays hidden.

## One-time setup

1. Create a Supabase production project from your Supabase account. For safer testing, create a second Supabase project and use it for Preview/local development.
2. Open **SQL Editor** in each project you plan to use, paste all of `poll-database.sql`, and run it once. This migration puts any earlier version that has never launched back into `not_launched` without deleting stored votes. Re-running it after launch does not reset the poll because its `launched_at` timestamp remains set. To schedule an end date, set `ends_at` in the `student_polls` row before launching:

   ```sql
   update public.student_polls
   set ends_at = '2030-01-01T00:00:00Z'
   where id = 'student-future';
   ```

   Replace the example with the date and time you choose; no date is assumed by the implementation. If the end date passes, the status and voting API treat the poll as closed; run the admin `close` action before publishing.

Supabase currently offers a Free plan that may be enough for a temporary poll, with quotas and project pausing rules. Its documentation says inactive Free projects can be paused after a week, so check the current [billing details](https://supabase.com/docs/guides/platform/billing-on-supabase) and [pause policy](https://supabase.com/docs/guides/platform/free-project-pausing) before relying on it for an open campaign.
3. In the Supabase production project settings, copy the project URL and the **service_role** key. Keep the service role key private; never put it in an HTML or JavaScript file. Use the test project's URL and key for Preview and local development.
4. Generate two independent long random secrets locally. For example, in PowerShell:

   ```powershell
   [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```

   Run it twice. Use one result as `POLL_ADMIN_TOKEN` and the other as `POLL_RATE_SECRET`.
5. In Vercel, open this site's **Settings → Environment Variables**. Set production credentials only in **Production**. Set `POLL_LAUNCH_ENABLED` to the literal value `false` (or leave it unset, which also means false). For **Preview** and **Development**, use the separate test Supabase project and different random admin/rate secrets, and leave the launch flag false unless you are deliberately testing the launch workflow there. Do not put production database credentials in Preview deployments.

   - `SUPABASE_URL` — the Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — the Supabase `service_role` key.
   - `POLL_ADMIN_TOKEN` — the first generated secret. This authorizes poll control actions.
   - `POLL_RATE_SECRET` — the second generated secret. It makes a keyed hash of Vercel's source IP for rate limiting; raw IP addresses are not stored in the poll tables.
   - `POLL_LAUNCH_ENABLED` — set to `false` before deployment. Setting it to `true` later only enables the protected launch action; it does not launch the poll on its own.

   Save them as **sensitive** variables where Vercel offers that option. Do not add these values to the repository or paste them into this chat.
6. Deploy through your normal Vercel workflow after setting the variables. API Functions are created from files under `/api`; no framework or npm dependency is required. Vercel documents this directory convention and the Node.js fetch handler format in its [Functions documentation](https://vercel.com/docs/functions/runtimes/node-js).
7. Confirm `GET /api/poll` returns `{"state":"not_launched"}` on the intended deployment. The navigation link stays hidden, the homepage prompt does not appear, and direct visits to `student-poll.html` show only an inactive message. If setup is missing or fails, the interface fails closed.

## Admin controls

There is intentionally no public admin page. Use an authenticated POST from your own terminal; the server checks the secret and performs an atomic state transition. To launch later, first set `POLL_LAUNCH_ENABLED=true` in Production and redeploy the server code; this still leaves the database at `not_launched`. Then, in PowerShell, set `$env:POLL_ADMIN_TOKEN` to your secret in that terminal and run the `launch` command. Only that authorized action changes the database status to `open`:

```powershell
Invoke-RestMethod -Method Post -Uri 'https://YOUR-SITE/api/poll?action=admin' -Headers @{ Authorization = "Bearer $env:POLL_ADMIN_TOKEN" } -ContentType 'application/json' -Body '{"action":"close"}'
Invoke-RestMethod -Method Post -Uri 'https://YOUR-SITE/api/poll?action=admin' -Headers @{ Authorization = "Bearer $env:POLL_ADMIN_TOKEN" } -ContentType 'application/json' -Body '{"action":"publish"}'
Invoke-RestMethod -Method Post -Uri 'https://YOUR-SITE/api/poll?action=admin' -Headers @{ Authorization = "Bearer $env:POLL_ADMIN_TOKEN" } -ContentType 'application/json' -Body '{"action":"unpublish"}'
Invoke-RestMethod -Method Post -Uri 'https://YOUR-SITE/api/poll?action=admin' -Headers @{ Authorization = "Bearer $env:POLL_ADMIN_TOKEN" } -ContentType 'application/json' -Body '{"action":"open"}'
Invoke-RestMethod -Method Post -Uri 'https://YOUR-SITE/api/poll?action=admin' -Headers @{ Authorization = "Bearer $env:POLL_ADMIN_TOKEN" } -ContentType 'application/json' -Body '{"action":"launch"}'
```

Use the actual hostname for `YOUR-SITE`. For launch, enable the server-side flag and then run `launch`; never use the admin command as a substitute for launch authorization. End voting with `close`, then separately run `publish` when you want results visible. Use `unpublish` to hide published results. `open` reopens a previously launched, closed poll if its end date has not passed. Closing never publishes results. The server returns totals only in the published state. The database launch timestamp survives deployments; deploying or redeploying does not set it or publish results.

## Local testing

Vercel Functions do not run when the site is opened directly from a file or served by a simple static server. Install the Vercel CLI, set these variables in the same PowerShell window (use test-project values, never production values), then run `vercel dev`:

```powershell
$env:SUPABASE_URL = 'https://YOUR-TEST-PROJECT.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'YOUR-TEST-SERVICE-ROLE-KEY'
$env:POLL_ADMIN_TOKEN = 'YOUR-64-CHARACTER-ADMIN-SECRET'
$env:POLL_RATE_SECRET = 'YOUR-OTHER-64-CHARACTER-SECRET'
$env:POLL_LAUNCH_ENABLED = 'false'
vercel dev
```

Use a separate Supabase test project so test votes never enter production. Run through this checklist in `vercel dev` and again on a Vercel Preview deployment:

- [ ] With the launch flag false, confirm `GET /api/poll` returns `not_launched`, the navigation link is hidden, the popup stays absent, a direct poll-page visit shows no choices, and vote POSTs return `403` without storing a vote.
- [ ] Set the test launch flag true; confirm the poll still reports `not_launched` until the admin-only `launch` action succeeds.
- [ ] After launch, dismiss the homepage prompt and reload; it stays dismissed for this campaign. Open Student Poll from navigation.
- [ ] Submit each option from separate test browser profiles.
- [ ] Submit again with the same browser token, then send two near-simultaneous requests using that same token; only one vote is accepted.
- [ ] Check the status response and page before publication: neither includes totals or a leading option.
- [ ] Call an admin action with a wrong token; it returns `401` and does not change poll state.
- [ ] Close voting. Confirm a vote is rejected and results are still hidden.
- [ ] Publish results. Confirm the poll page shows the actual counts and total; then unpublish and confirm the counts disappear again.
- [ ] Check reopening with no end date and rejection of reopening after a configured end date. Confirm redeploying does not change the status or publish results.
- [ ] Check dark/bright themes and small/wide viewports, then confirm existing pages, PDF links, and Vercel Analytics still work.

## Privacy and practical limits

Votes retain only a SHA-256 hash of a random browser token, the selected option, and the timestamp. Rate limiting retains a keyed hash of Vercel's validated `x-vercel-forwarded-for` IP in a one-minute bucket and removes older buckets during voting. It is an abuse limit, not a guarantee: distributed clients or changing networks can bypass per-IP limits. The browser token is also not proof of one vote per student; clearing browser storage or changing browser/device can allow another vote. Avoid reusing these tables for a new polling campaign without first deciding whether to retain or delete the old votes.
