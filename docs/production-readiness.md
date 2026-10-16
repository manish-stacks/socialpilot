# Production-readiness report (final audit)

**Verdict: NOT production-ready.** It is a well-tested, security-conscious *foundation* that has never been run end-to-end against MySQL, Redis, S3, Gemini or Meta. Treat it as a pre-alpha you finish and harden, not something to deploy.

## What was verified in the final audit (by running it)
| Check | Result |
|---|---|
| Prisma schema validation (`prisma format`, real validator) | Found the schema was **invalid since Phase 1** (single-line `enum`/`generator` blocks). Fixed; now validates. |
| API strict `tsc` against **real generated Prisma types** | 3 real type errors found and fixed; now 0. |
| API unit tests (jest, project config) | 104 / 104 pass (13 suites). Providers/fetch/Redis/DB are mocked. |
| Web `tsc` + `next build` | Pass (all customer + admin routes). |
| Secret scan, TODO/placeholder scan | Clean (one intentional test fixture). |
| Every controller guarded (global JWT + workspace/admin guards) | Verified by test + grep. |

## Defects found and fixed in this audit
1. **Invalid Prisma schema** (would not have migrated at all).
2. **Manual retry / reschedule silently dropped:** BullMQ ignores a duplicate `jobId`, and my ids repeated after retry. Added `PostTarget.generation` to the job id.
3. **Edit-vs-publish race could duplicate a post:** editing a scheduled post replaced its targets even if a worker had just claimed one. Replacement now only deletes untouched targets and rolls back otherwise.
4. **Refresh-token race:** two tabs/StrictMode refreshing at once logged the user out everywhere. Added client single-flight + 10s server grace.
5. **Login timing leak** (unknown email returned faster). Now always runs one argon2 verify.
6. Unvalidated `status` filter on posts list (500 on bad input); now validated.
7. Production footguns: env validation now refuses `ALLOW_MOCK_ACCOUNTS=true`, placeholder JWT secret, or missing encryption key when `NODE_ENV=production`; Swagger off in production unless `ENABLE_SWAGGER=true`; `TRUST_PROXY` support for correct rate-limit IPs.
8. Repo-wide Nest 12/11 duplicate (fixed earlier via `overrides`).

## Blockers: must be done before any real launch
- **No Prisma migrations are committed.** I could not generate them (the sandbox cannot download Prisma's schema engine). Run `npm run db:migrate -- --name init` against MySQL 8 and commit `prisma/migrations`. The schema has *never* been applied to a real database, so index/length/FK problems may still surface.
- **Never executed against real services:** MySQL, Redis/BullMQ, S3, Gemini, Meta. All integration tests use mocks. The scheduler, worker, reconciler and duplicate-prevention logic are unit-tested but not load- or chaos-tested.
- **No end-to-end or HTTP-level integration tests** (register -> schedule -> publish). Authorization is tested at guard/service level, not through the running app.
- **Missing features that the original spec required:** password reset, email verification, invitation emails, public marketing site (home/pricing/FAQ/contact), Privacy Policy & Terms pages (also required for Meta App Review), cookie settings, billing (checkout, webhooks, portal), revenue metrics, LinkedIn/TikTok/YouTube/X, Calendar week/day views, approval workflow UI, Dockerfiles for api/web/worker, backup/restore runbook, observability (structured logging/metrics/alerts).
- **Meta approval:** development-mode only until App Review + Business Verification; Data Deletion callback not implemented.
- **Unconfirmed provider assumptions** (see docs/integrations.md): page-token non-expiry, container `PUBLISHED` status for duplicate-safe resume, `file_url` video upload.

## Known risks / limitations
- Invitation acceptance trusts the invited email without email verification (mitigated only by the one-time invite token). Fix by shipping email verification.
- Uploads are validated by declared MIME type and size, not file contents (no magic-byte or malware scan).
- Facebook has no idempotency key: after a lost response a target becomes UNCERTAIN and needs a human. This is by design, but it is operational toil.
- Rate limiting is in-memory per API instance (ThrottlerModule default); use a Redis store when running multiple instances.
- Access control for admin relies on a single role flag; no MFA, IP allow-list or step-up auth for admins.
- `npm audit`: 7 findings (4 high) remain; they need breaking `--force` upgrades (build-time PostCSS inside Next.js, an internal Prisma transitive). Revisit when Next/Prisma ship patched releases.
- CSRF: refresh cookie is `SameSite=Strict`, access token is a header; no separate CSRF token. Acceptable only if web and API share a site; re-evaluate for cross-site deployments.
- Prices in the plans table are placeholders, not a commercial decision.

## Release checklist (ordered)
1. `npm i && npm run db:generate && npm run lint && npm test && npm run build`
2. Create migrations on MySQL 8; commit them; run `db:migrate deploy` in CI/CD.
3. Provision Redis, S3-compatible bucket (public-readable via signed URLs for Meta; CORS PUT for the web origin), secrets manager.
4. Set all env vars from `.env.example` (production validation will refuse unsafe values).
5. Run API, **worker** (separate process), web; confirm `/api/v1/health` and admin Publishing page show the queue/worker healthy.
6. Create the first admin: `npm run admin:promote -- you@example.com`.
7. Meta: create app, add test users, verify Facebook Page + Instagram publishing with real accounts in development mode, then submit App Review.
8. Build the missing items above (email verification/reset, legal pages, billing), add E2E tests, then load-test the worker.
