# Challenge service

Points-based challenge layer on top of an Open Wearables instance.

Scoring: 1 point each for ≥8,000 steps, >7 hours sleep, and >30 minutes of
workout, per local day (max 3/day/person). Local day is derived from the
UTC offset embedded in each wearable's own timestamp — not a stored
per-person timezone — so someone traveling mid-challenge is still scored
correctly for wherever they actually were.

## Before you start

Confirm two things against your running Open Wearables instance's Swagger
docs (`{OPEN_WEARABLES_API_URL}/docs`), since this scaffold was built from
public documentation rather than the live OpenAPI spec:

1. **Timestamp format** — do `/summaries/activity`, `/summaries/sleep`, and
   `/events/workouts` return timestamps with the UTC offset embedded
   (e.g. `2026-07-01T22:15:00+05:30`), or bare UTC (`...Z`)? This
   determines whether `lib/timezone.ts` can read the offset directly or
   needs a raw-payload fallback for some providers.
2. **Webhook event types and payload shape** — confirm the exact
   `event_type` strings and payload structure at
   `openwearables.io/docs/api-reference/guides/webhooks`, and adjust the
   `switch` statement in `app/api/webhooks/openwearables/route.ts` to match.

Field names referenced in `lib/scoring.ts` (`steps`, `duration_seconds`,
`start_time`, etc.) are best guesses from provider documentation — check
one real response payload and adjust if needed.

## Local setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, OPEN_WEARABLES_API_URL, etc.
npx prisma migrate dev --name init
npm run dev
```

Dashboard: `http://localhost:3000/leaderboard`
Manual metrics form: `http://localhost:3000/metrics`

## Adding a challenge and participants

No admin UI yet — simplest path for a small group is Prisma Studio:

```bash
npx prisma studio
```

Create one `Challenge` row (start/end dates), then one `Participant` row
per friend, linking their Open Wearables `user_id` (from the Open
Wearables dashboard) to the challenge.

## Deploying on Railway

1. New service in the same Railway project as Open Wearables, pointing at
   this repo.
2. Add a **separate Postgres plugin** for this service — don't reuse Open
   Wearables' database, to avoid migration conflicts.
3. Set env vars from `.env.example` (`DATABASE_URL` can reference the new
   Postgres plugin directly via Railway's variable references).
4. Build command: `npm run build && npx prisma migrate deploy`
   Start command: `npm run start`
5. Add a second Railway service (or a cron-scheduled service in the same
   project) running `npm run reconcile` on a schedule, e.g. every few
   hours (`0 */4 * * *`). Because scoring is idempotent, running it more
   often than "once a day" is fine and actually safer across timezones.
6. In the Open Wearables dashboard, register a webhook subscription
   pointing at `https://<this-service>.up.railway.app/api/webhooks/openwearables`
   with the same secret as `OPEN_WEARABLES_WEBHOOK_SECRET`.

## What's not built yet

- Admin UI for creating challenges/participants (use Prisma Studio for now)
- Streaks, personal bests, group averages (see build plan doc)
- Automated provider disconnect at challenge end (manual for now — see
  `disconnectProvider` in `lib/openWearables.ts`)
- Body metrics comparison charts (data model + entry form are in place;
  charting UI is the next step)
