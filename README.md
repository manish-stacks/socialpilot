# SocialPilot AI (working name)
Monorepo: `apps/api` (NestJS 11, `/api/v1`, Swagger at `/api/docs`), `apps/web` (Next.js 15), `prisma/` (MySQL schema + seed), `infra/` (MySQL + Redis).

## Setup
```
npm install
cp .env.example .env && cp .env.example apps/api/.env
docker compose -f infra/docker-compose.yml up -d
npm run db:generate && npm run db:migrate && npm run db:seed
npm run dev:api   # :4000
npm run dev:worker
npm run dev:web   # :3000
npm test && npm run lint && npm run build
```
Seed users (test data only): demo@example.test / admin@example.test, password `TestPassword123!`.

