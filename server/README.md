# Weekly Report Generator — API

Express + MongoDB backend with AWS Cognito authentication.

## Running locally

```bash
cd server
cp .env.example .env   # fill in MONGO_URI and Cognito vars
npm install
npm run dev
```

## Postman

Import both files from `server/postman/`:

- `weekly-reports.postman_collection.json`
- `weekly-reports.postman_environment.json`

Set the environment `token` to a valid **Cognito ID token** (Bearer). The collection uses `{{baseUrl}}` (default `http://localhost:5000`) and stores `projectId` / `reportId` from create responses for chained requests.

**Suggested run order:** use a **Manager** token for Projects → Create/Update, then switch to a **TeamMember** token for report create/submit flows, then switch back to **Manager** for `GET /api/reports`.

## Role-based access control

All `/api/projects` and `/api/reports` routes require a valid Cognito JWT. The `authenticate` middleware verifies the ID token and attaches `req.user` (`userId`, `email`, `role`). Role comes from Cognito groups: `Manager` or `TeamMember`.

| Endpoint | Auth | Role | Notes |
|----------|------|------|-------|
| `GET /api/projects` | Bearer | Any authenticated | Team members need the project list to tag reports. |
| `POST /api/projects` | Bearer | **Manager** | `createdBy` is set from `req.user.userId`. |
| `PUT /api/projects/:id` | Bearer | **Manager** | Full body validated with `projectSchema`. |
| `DELETE /api/projects/:id` | Bearer | **Manager** | |
| `POST /api/reports` | Bearer | **TeamMember** | Owner is always `req.user.userId`; body `status` / `submittedAt` are ignored. |
| `GET /api/reports/me` | Bearer | Any authenticated | Returns only the caller's reports. Optional `?project=`, `?page=`, `?limit=`. |
| `PUT /api/reports/:id` | Bearer | Owner only | Service checks `report.owner === req.user.userId`. Submitted reports return **409** unless `?force=true`. |
| `PATCH /api/reports/:id/submit` | Bearer | Owner only | Sets `status: "submitted"` and `submittedAt: now`. |
| `GET /api/reports` | Bearer | **Manager** | Team-wide view. Query: `week`, `teamMember`, `project`, `from`, `to`. |

### Submitted report edits (`?force=true`)

By default, once a report is submitted it is **immutable** (HTTP 409). Pass `?force=true` on `PUT /api/reports/:id` to allow the owner to correct a submitted report; `submittedAt` is refreshed to the edit time. This keeps normal submissions locked while allowing post-review fixes without reopening the workflow.

### Manager `submissionStatus`

`GET /api/reports` returns `{ reports, submissionStatus }`. For each team member and week in scope:

- **submitted** — at least one report with `status: "submitted"` for that week
- **pending** — week has not ended and no submission yet
- **late** — `weekEndDate` is in the past with no submission

Week scope comes from `?week=`, or `?from=` / `?to=`, or defaults to the current calendar week (Monday–Sunday).

## Architecture

```
routes → controllers (HTTP) → services (Mongoose) → models
```

Services in `src/services/` are shared by REST controllers and future MCP tools — import services directly, not route handlers.
