# Engineering foundation milestone

## Decision

The initial production architecture is an ABP layered monolith with two independently deployable React applications. Domain and application modules remain separated in code; deployment stays simple while claims, campaigns, review, and payment operations still require one transactional boundary.

## Included now

- ABP 10.6.0 on .NET 10 using the official layered application template.
- PostgreSQL with EF Core migrations and ABP data seeding.
- Permission definitions for foundation verification, campaign management, claim review, sensitive data, payment authorization/reconciliation, reports, and audit access.
- ABP audit logging persisted to the database. GET requests are excluded to avoid noisy logs; mutations remain auditable.
- Notification outbox persistence with masked recipients. No external email/SMS is sent in this milestone.
- Typed ABP BLOB container, local filesystem provider in Docker, and the official Google Cloud Storage provider selectable through configuration.
- Public React shell and an Admin verification screen backed by the real API.
- Local Docker Compose, deterministic dependency lock files, and future Cloud Run/Cloud SQL/GCS templates.

## Explicitly excluded

- Real claim submission, bank account collection, campaign CRUD, review workflow, reports, payment integration, and AORUS SSO.
- Real notification delivery.
- Production authentication/UI authorization enforcement. Permission policies are defined now and will be applied to feature endpoints with the chosen corporate identity integration.
- Any GCP resource creation or deployment.

## Local verification

```powershell
Copy-Item .env.example .env
docker compose up --build -d
.\scripts\verify-local.ps1
```

Open:

- Public React: <http://localhost:5173>
- Admin verification: <http://localhost:5174>
- ABP Swagger: <http://localhost:44305/swagger>
- Health endpoint: <http://localhost:44305/health>

The **Run verification** action is enabled only in the Development configuration. It writes a synthetic PostgreSQL check, a masked notification outbox item, and a text marker through ABP `IBlobContainer`. The upload control accepts sample files up to 1 MiB. Do not use personal or production data.

## Acceptance checks

1. `docker compose ps` shows PostgreSQL, API, Public React, and Admin React running; the migrator has exited with code 0.
2. The health endpoint returns HTTP 200.
3. The Admin screen reports PostgreSQL connected, ABP audit logging enabled, and FileSystem BLOB storage.
4. Running verification adds a check, notification outbox item, file record, and subsequent audit-log record.
5. A sample non-sensitive file uploads and downloads with its SHA-256 hash visible.
