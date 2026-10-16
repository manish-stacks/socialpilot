# Admin dashboard

## Access model
- Admin = `User.systemRole = ADMIN` in MySQL. **There is no API route that grants it.** Promote on the server: `npm run admin:promote -- someone@example.com` (audit-logged). The seed creates `admin@example.test` for local dev only.
- Enforcement is in NestJS: global `JwtAuthGuard` (re-reads the user from MySQL every request, so suspension/demotion is immediate) then `AdminGuard` on the whole `AdminController`. A unit test asserts the guard is attached to the controller. The `/admin` UI shell also checks `/admin/me`, but that is cosmetic.
- Denied attempts are written to the audit log (`admin.access_denied`, path only, no query string). Admin sign-ins are logged (`admin.login`).

## Pages (all backed by real queries)
| Page | Source |
|---|---|
| Overview | counts/groupBy over users, sessions, workspaces, accounts, posts, targets, AI generations, subscriptions |
| Users | list/search/filter; detail (sessions, usage, activity); suspend/reactivate (reason required, sessions revoked, audited). Never returns password hashes or tokens. Admins can't be suspended here and can't suspend themselves. |
| Workspaces | list/detail (members, accounts without credentials, usage vs plan); suspend/reactivate (members get 403, worker skips publishing) |
| Plans & subscriptions | create/edit plans and limits (audited with before/after). Subscriptions are read-only: they may only change via verified provider webhooks (Phase 7). |
| Usage & AI | generations by workspace/mode/day; model name + configured flag (no key) |
| Publishing queue | DB target states, BullMQ counts (if Redis reachable), overdue/stale/exhausted counts, p50/p95 latency from attempt records; failed + uncertain list with provider codes; guarded retry |
| Integrations | env **presence** (never values), per-platform account health, 24h success/failure |
| System settings | allow-listed flags: maintenance mode, signups, AI, uploads, support email, AI system prompt. Maintenance mode blocks non-admin authenticated API traffic (login/health stay up). |
| Audit log | every admin action + workspace/post events, filterable |

## What is deliberately *not* shown as a number
- **Revenue / MRR:** no payment provider or payment events exist yet, so it's labelled unavailable rather than estimated.
- **AI cost:** token usage isn't recorded, so cost can't be computed honestly (generation counts are real).
- **Abuse reports:** no reporting feature exists yet.
- **Webhook status:** reports "none configured, 0 events".

## Retry safety
Admin retry calls the same `PostsService.retryTarget` as customers: account must be ACTIVE; `UNCERTAIN` targets require explicit duplicate-risk confirmation; the state change is one transaction; the worker still performs its atomic claim. Post captions are not exposed in the failed-jobs view.

## Known limits
- "Active users" = users who started a session in the range (sign-in or token refresh), not page views.
- Plan edits apply immediately to all workspaces on that plan; there is no staged rollout.
- AI prompt override replaces the whole system prompt; a bad prompt makes generation fail validation (output is schema-checked), so test after changing.
- Rate limiting for AI abuse is the existing per-route throttle (20/min) plus monthly plan credits; there is no per-user ban list besides suspension.
