# Integrations: setup, status and blockers

Verified against Meta/Google developer docs on 2026-10-16. Nothing below has been run against live credentials. Unit tests use mocked `fetch`/providers only.

## Gemini (AI Studio)
- Server-side only, `@google/genai` `models.generateContent` with `responseMimeType: application/json`; output validated with zod; monthly plan credit limit enforced from MySQL.
- Set `GEMINI_API_KEY` and `GEMINI_MODEL`. `gemini-3.5-flash` is a documented stable id; newer stable Flash models also exist (check ai.google.dev/gemini-api/docs/models).
- **Blocked by:** an API key (not in repo). Without it the endpoint returns 503 "AI is not configured".

## Meta (Facebook Pages + Instagram), Graph API v26.0 (latest per Meta changelog; override with `META_GRAPH_VERSION`)
**Selected Instagram flow:** *Instagram API with Facebook Login*, i.e. professional (Business/Creator) accounts linked to a Facebook Page, publishing through the Page token. Not implemented: Instagram Login (standalone) and Stories.

| Platform | Calls used |
|---|---|
| Facebook text/link | `POST /{page-id}/feed` (`message`) |
| Facebook photo | `POST /{page-id}/photos` (`url`, `caption`) ; several photos: unpublished uploads then `/feed` with `attached_media[n]` |
| Facebook video | `POST /{page-id}/videos` (`file_url`, `description`) |
| Instagram image/Reel/carousel | `POST /{ig-id}/media` -> poll `GET /{container}?fields=status_code` -> `POST /{ig-id}/media_publish` (`creation_id`) |
| Discovery | `GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username}` |

**Permissions requested:** `pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish` (override: `META_SCOPES`). Business-portfolio-owned Pages may additionally need `business_management`.

### Setup
1. Create a Meta app (Business type), add *Facebook Login*. Valid OAuth redirect URI: `${API_PUBLIC_URL}/api/v1/oauth/meta/callback`.
2. Set `META_APP_ID`, `META_APP_SECRET`, `API_PUBLIC_URL`, `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`).
3. Media must be fetchable by Meta: the bucket's signed GET URLs must be reachable from the public internet (local MinIO on localhost will not work for Meta; use a public S3-compatible endpoint or tunnel).
4. Run API, worker (`npm run dev:worker`), Redis, MySQL.

### Blocked by credentials / Meta review (cannot be done from code)
- **Development mode works only for app roles** (admins/developers/testers) and Pages/IG accounts they manage. Publishing for other customers requires **App Review** for `pages_manage_posts`, `instagram_content_publish` (and the others above) plus **Business Verification** / Advanced Access.
- App Review requires a screencast, privacy policy URL, and a **Data Deletion callback / instructions URL** (not implemented yet; add before going live).
- Instagram requires a professional account linked to a Page; personal accounts cannot publish via API.
- Instagram image format/size/aspect rules and per-account publishing quota are enforced by Meta; we check `content_publishing_limit` best-effort and surface Meta's error text. Verify exact media constraints against current docs when testing.
- Details I could not confirm from docs and treat as assumptions to verify with live credentials: Page tokens derived from a long-lived user token having no expiry; `status_code=PUBLISHED` on a container after publish (used for duplicate-safe resume); `file_url` for Page video upload.

## Reliability design (who guarantees what)
- **MySQL is authoritative.** Redis jobs are a cache of intent; the worker's reconciler (every 60s and at start) re-creates missing jobs and releases claims from crashed workers.
- **One job per target**, deterministic job id (`target + attempts + polls + scheduledAt`), so enqueueing is idempotent.
- **Atomic claim** (`UPDATE ... WHERE status IN (...) AND claimedAt IS NULL/stale AND post.status IN (SCHEDULED, PUBLISHING)`); a second worker or a cancelled post gets 0 rows and does nothing. Cancel flips the post with a guarded UPDATE, so cancel vs. publish races resolve in the database.
- **Retries:** transient/rate-limit errors back off exponentially (30s doubling, cap 30m, rate limits >= 15m), max `PUBLISH_MAX_ATTEMPTS`; permanent errors and auth errors do not retry; auth errors mark the account EXPIRED. Instagram media still processing is re-polled (does not consume attempts, max ~30 min).
- **No exactly-once claim.** Facebook has no idempotency key. Before the publish POST we persist `stage=SENDING`. If the outcome is lost (timeout after sending, crash), the next run first **looks for the post** (recent feed match); if not found the target becomes **UNCERTAIN** and is never auto-retried. A human must confirm "retry anyway" (audit-logged). Instagram containers can be published once, so resuming a saved container id is duplicate-safe.
- Every attempt is recorded (sanitized, tokens redacted) in `PublishingAttempt`.
