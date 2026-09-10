# GCP UAT deployment

Deployed and verified **2026-09-10**. Project `side-project-platform`, account `yoyo.chen@gigabyte.com`, region `asia-east1` (Taiwan). Sized for 3 testers using synthetic data for approximately 30 minutes. This environment has no bank API or real email sending.

## Resource inventory

| Service | Resource | Configuration / purpose |
|---|---|---|
| Cloud SQL | `cashback-uat-db` | PostgreSQL 17 Enterprise, `db-f1-micro`, single zone, 10GB SSD, no HA, automatic backup/PITR or storage expansion. Public IP with no authorized networks; Cloud SQL Auth Proxy connects from Cloud Run. |
| Artifact Registry | `cashback-uat` | Regional Docker images: API, migrator and combined public/admin gateway. |
| Cloud Build | On-demand builds | `cloudbuild.yaml`; source archive uses existing `side-project-platform_cloudbuild` bucket. |
| IAM | `cashback-uat@side-project-platform.iam.gserviceaccount.com` | Dedicated runtime. Cloud SQL Client, bucket-scoped Object Admin and access to only runtime secrets. |
| Cloud Run | `cashback-uat` | One service, gateway + API containers; minimum 0, maximum 1 instance, concurrency 10; 2 vCPU / 1.25GiB total while requests run. Revision `cashback-uat-00002-w6n`, 100% traffic. |
| Cloud Run Job | `cashback-uat-migrator` | 1 task, 1 vCPU / 1GiB, 0 retries; successful execution `cashback-uat-migrator-2mc42`. |
| Cloud Storage | `side-project-platform-cashback-uat-evidence` | Private ABP claim evidence; same region. Runtime Object Admin + Legacy Bucket Reader (ABP requires `storage.buckets.get` before uploading). |
| Cloud Storage | `side-project-platform-cashback-uat-keys` | Private persistent ASP.NET Core Data Protection keys across instance restarts; runtime Object Admin. Persisted XML key verified. |
| Secret Manager | `cashback-uat-db`, `cashback-uat-encryption` | Active database connection and bank-field encryption secrets. Runtime access is limited to these two secrets; version 1, asia-east1. |
| Secret Manager (retired) | `cashback-uat-access`, `cashback-uat-htpasswd` | Previous gateway credentials retained for rollback, no longer mounted or used. Version 1 disabled after rollout; runtime htpasswd access removed. |
| Cloud Logging / Monitoring | Existing project services | Build/run diagnostics and built-in metrics. No dedicated paid dashboard, load balancer, NAT, Redis or Kubernetes cluster. |

The existing `gigabyte-cashback` prototype service and unrelated project services are unchanged. No local database or personal claim data is copied to GCP.

Newly enabled APIs: `sqladmin.googleapis.com`, `secretmanager.googleapis.com`. Cloud Run, Artifact Registry, Cloud Build, Storage, IAM, Logging and Monitoring APIs were already enabled.

## UAT access

- Public: https://cashback-uat-219894818230.asia-east1.run.app/
- Admin: https://cashback-uat-219894818230.asia-east1.run.app/admin/
- No gateway username or password is required. The user explicitly requested open UAT access for everyone.
- Press the application development-login button to use the mock identity. Anyone can do this, including for admin operations; all testers share the mock identity and records.
- Cloud Run retains `allUsers` / `roles/run.invoker`. Database/buckets remain private; API application session and XSRF checks remain in place.
- Admin language is selectable in the header: English / 繁體中文. It persists separately from the public-web language; business values and user-entered content remain unchanged.
- Showcase campaign `3a239bb0-cc84-c268-40a6-26756a441699` is ready. Synthetic integration fixtures remain visible only through admin/owned claims.

## Application arrangement

The gateway serves public web at `/`, admin at `/admin/`, and proxies `/api/` to the ABP container over localhost. The gateway is publicly accessible over Cloud Run HTTPS without Basic authentication. The API has no separate public service. The explicit development-login button remains; all testers share the existing mock identity. Cookie and XSRF traffic stays on the same origin.

Credentials are never included in images, Git, README or URLs. `provision.ps1` is a **first-install script**, not a credential rotation script: do not rerun after partial creation without first inspecting existing resources. It writes temporary secrets only under ignored `.uat-test/gcp-secrets`. Do not change the encryption secret after bank data exists without a migration/rotation plan.

Temporary local credential files were removed after successful deployment; Secret Manager retains the authoritative copies. SQL is currently running (`activationPolicy=ALWAYS`) so UAT is ready to use; stop it after the actual test session using the commands below.

Schema upgrades use the existing ABP DbMigrator and EF migrations. This deployment adds no database schema, so no new migration is needed. UAT keys use the private bucket mounted at `/app/keys`; `DataProtection:KeyPath` is optional and local development behavior remains unchanged.

Verified build: `43b2b63d-f58f-441d-af6a-db89704fc3a8` **SUCCESS**, tag `uat-20260910`. API digest `89679de9e8201b2c201972497d86d522c741bf4c6654ab36e40fb0c3fb1feac1`; migrator `3933c1211d9af0ce3d5aaf1022c540a1000974a489c87c3b51409c20660fcfd2`; gateway `116739b6fedffc88efd8286c80199194a9a4e6489a0907e32db7cca387d2b343`. Local backend tests: 29 passed. Migration completed successfully in 18.2 seconds. Cloud HTTP integration: 24 passed, including real Cloud SQL transactions and GCS evidence upload. That initial release used Basic authentication. The later open-UAT release below supersedes that entry policy.

## Open UAT / admin language release

Gateway build `62f35b35-a8b0-43a5-9c92-e47e5423718d` succeeded, image tag `uat-20260910-open-zh`, digest `sha256:d4addcdd719b4cd2e55aca65ad1c6989fa415ed53ef9026e9f60d8a5364c76be`. API and database are unchanged; no migration needed for this frontend/configuration release.

Revision `cashback-uat-00002-w6n` passed 24 cloud business-flow checks and anonymous access checks for both apps, health and public API routes without Authorization/cookies. No Basic challenge is returned. Browser checks confirmed Chinese login/navigation, campaign fields, reports and payments/notifications, preservation of an unsaved campaign name when switching language, and language persistence after reload. Retired gateway secret versions were disabled and their runtime accessor binding removed after rollout.

## Build and release

```powershell
gcloud builds submit . --config=deploy/gcp/uat/cloudbuild.gateway.yaml --substitutions=_TAG=uat-20260910-open-zh --project=side-project-platform --account=yoyo.chen@gigabyte.com
# This frontend-only release reuses the existing API/database; deploy the built gateway:
gcloud run services replace deploy/gcp/uat/service.yaml --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
```

`scripts/verify-operations.mjs`, `scripts/verify-uat-access.mjs` and `scripts/seed-showcase.mjs` accept `CASHBACK_API_URL`. Current UAT verification uses no gateway password or IAM token. The optional authentication helper remains compatible with private/protected environments; it only adds supplied credentials to the configured API origin and refuses redirects. Set `CASHBACK_PUBLIC_URL` when running the showcase script to report the correct public URL.

From the repository root with Node 24, run `./deploy/gcp/uat/verify.ps1` (optional `-NodePath` for a specific Node executable, `-SeedShowcase` for the idempotent showcase). It verifies anonymous entry with no credentials and runs clearly marked synthetic integration records through the development-login flow.

For later releases, use a unique image tag and update both manifests. This prevents an ambiguous mutable-tag rollback. When backend schema changes, build the API/migrator images and run the ABP migration job before updating API traffic. The current open UAT uses the gateway as its only incoming service. To restore the previous password-protected revision, first re-enable its retired secrets and restore the runtime htpasswd accessor binding.

## Stop / resume and cost

```powershell
./deploy/gcp/uat/power.ps1 -Action status
./deploy/gcp/uat/power.ps1 -Action start # Before testing; wait for completion.
./deploy/gcp/uat/power.ps1 -Action stop  # After testing; retains database data.
```

Cloud Run scales to zero when idle; Cloud SQL must be explicitly stopped. Stopping SQL makes the application unavailable until resumed. Storage, image and secret charges can remain after SQL is stopped. Disabling an API does not delete billable resources. No automatic deletion or timed shutdown is configured, because the actual testing start time has not been specified.

For one 30-minute test, runtime compute should be only a small fraction of US$1; first builds, downloads and retained storage are additional. These are estimates, not a billing cap. A continuously running SQL micro instance incurs hourly charges even with no users. Review actual Taiwan rates and project billing:

- [Cloud SQL pricing](https://cloud.google.com/sql/pricing)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Storage pricing](https://cloud.google.com/storage/pricing)
- [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing)
- [Secret Manager pricing](https://cloud.google.com/secret-manager/pricing)

To remove UAT permanently, first export any required test records, then delete only the named UAT service/job, SQL instance, buckets, secrets, image repository and service account. Deleting persistent resources destroys their test data; do not delete unrelated resources or disable APIs used by other applications.
