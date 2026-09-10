# GCP UAT deployment

Deployed and verified **2026-09-10**. Project `side-project-platform`, account `yoyo.chen@gigabyte.com`, region `asia-east1` (Taiwan). Sized for 3 testers using synthetic data for approximately 30 minutes. This environment has no bank API or real email sending.

## Resource inventory

| Service | Resource | Configuration / purpose |
|---|---|---|
| Cloud SQL | `cashback-uat-db` | PostgreSQL 17 Enterprise, `db-f1-micro`, single zone, 10GB SSD, no HA, automatic backup/PITR or storage expansion. Public IP with no authorized networks; Cloud SQL Auth Proxy connects from Cloud Run. |
| Artifact Registry | `cashback-uat` | Regional Docker images: API, migrator and combined public/admin gateway. |
| Cloud Build | On-demand builds | `cloudbuild.yaml`; source archive uses existing `side-project-platform_cloudbuild` bucket. |
| IAM | `cashback-uat@side-project-platform.iam.gserviceaccount.com` | Dedicated runtime. Cloud SQL Client, bucket-scoped Object Admin and access to only runtime secrets. |
| Cloud Run | `cashback-uat` | One service, gateway + API containers; minimum 0, maximum 1 instance, concurrency 10; 2 vCPU / 1.25GiB total while requests run. Revision `cashback-uat-00001-zfm`. |
| Cloud Run Job | `cashback-uat-migrator` | 1 task, 1 vCPU / 1GiB, 0 retries; successful execution `cashback-uat-migrator-2mc42`. |
| Cloud Storage | `side-project-platform-cashback-uat-evidence` | Private ABP claim evidence; same region. Runtime Object Admin + Legacy Bucket Reader (ABP requires `storage.buckets.get` before uploading). |
| Cloud Storage | `side-project-platform-cashback-uat-keys` | Private persistent ASP.NET Core Data Protection keys across instance restarts; runtime Object Admin. Persisted XML key verified. |
| Secret Manager | `cashback-uat-db`, `cashback-uat-encryption`, `cashback-uat-htpasswd` | Database connection, bank-field encryption and UAT gateway password hash. Runtime gets access only to these three secrets. All version 1, region asia-east1. |
| Secret Manager | `cashback-uat-access` | UAT username/password for the owner to retrieve; no runtime access. Version 1, region asia-east1. |
| Cloud Logging / Monitoring | Existing project services | Build/run diagnostics and built-in metrics. No dedicated paid dashboard, load balancer, NAT, Redis or Kubernetes cluster. |

The existing `gigabyte-cashback` prototype service and unrelated project services are unchanged. No local database or personal claim data is copied to GCP.

Newly enabled APIs: `sqladmin.googleapis.com`, `secretmanager.googleapis.com`. Cloud Run, Artifact Registry, Cloud Build, Storage, IAM, Logging and Monitoring APIs were already enabled.

## UAT access

- Public: https://cashback-uat-219894818230.asia-east1.run.app/
- Admin: https://cashback-uat-219894818230.asia-east1.run.app/admin/
- Gateway username: `uat`. The owner can retrieve the JSON `{username,password}` from [cashback-uat-access version 1](https://console.cloud.google.com/security/secret-manager/secret/cashback-uat-access/versions?project=side-project-platform). Share the test password with the intended testers through your normal private channel, not GitHub.
- After the browser password prompt, use development button login inside the application. All three testers share the mock application identity and records.
- The user explicitly approved `allUsers` / `roles/run.invoker` on this gateway service. Every route is still protected by Basic authentication over HTTPS. There is no separately published API service or publicly readable evidence bucket.
- Showcase campaign `3a239bb0-cc84-c268-40a6-26756a441699` is ready. Synthetic integration fixtures remain visible only through admin/owned claims.

## Application arrangement

The gateway serves public web at `/`, admin at `/admin/`, and proxies `/api/` to the ABP container over localhost. The gateway protects every request with HTTP Basic authentication over Cloud Run HTTPS. The API has no separate public service. Development button login remains behind this gate; all testers share the existing mock identity. Cookie and XSRF traffic stays on the same origin.

Credentials are never included in images, Git, README or URLs. `provision.ps1` is a **first-install script**, not a credential rotation script: do not rerun after partial creation without first inspecting existing resources. It writes temporary secrets only under ignored `.uat-test/gcp-secrets`. Do not change the encryption secret after bank data exists without a migration/rotation plan.

Temporary local credential files were removed after successful deployment; Secret Manager retains the authoritative copies. SQL is currently running (`activationPolicy=ALWAYS`) so UAT is ready to use; stop it after the actual test session using the commands below.

Schema upgrades use the existing ABP DbMigrator and EF migrations. This deployment adds no database schema, so no new migration is needed. UAT keys use the private bucket mounted at `/app/keys`; `DataProtection:KeyPath` is optional and local development behavior remains unchanged.

Verified build: `43b2b63d-f58f-441d-af6a-db89704fc3a8` **SUCCESS**, tag `uat-20260910`. API digest `89679de9e8201b2c201972497d86d522c741bf4c6654ab36e40fb0c3fb1feac1`; migrator `3933c1211d9af0ce3d5aaf1022c540a1000974a489c87c3b51409c20660fcfd2`; gateway `116739b6fedffc88efd8286c80199194a9a4e6489a0907e32db7cca387d2b343`. Local backend tests: 29 passed. Migration completed successfully in 18.2 seconds. Cloud HTTP integration: 24 passed, including real Cloud SQL transactions and GCS evidence upload. The public endpoint additionally passed gateway checks on `/`, `/admin/`, `/health`, `/api/dev-auth/session` and `/api/operations/campaigns`: no password returns 401, correct password returns 200; both built JavaScript bundles are accessible; gateway authentication alone does not create an application session.

## Build and release

```powershell
gcloud builds submit . --config=deploy/gcp/uat/cloudbuild.yaml --substitutions=_TAG=uat-20260910 --project=side-project-platform --account=yoyo.chen@gigabyte.com
# After authorized resource/secret provisioning and database creation:
gcloud run jobs replace deploy/gcp/uat/migrator.yaml --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
gcloud run jobs execute cashback-uat-migrator --wait --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
# Deploy only after migration succeeds:
gcloud run services replace deploy/gcp/uat/service.yaml --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
```

`scripts/verify-operations.mjs`, `scripts/verify-uat-access.mjs` and `scripts/seed-showcase.mjs` accept `CASHBACK_API_URL` and the base64 `username:password` in `CASHBACK_UAT_BASIC_AUTH`. For an IAM-private deployment, supply `CASHBACK_RUN_ID_TOKEN` as well. Supply credentials only through process environment variables. The HTTP helper only adds them to the configured API origin and refuses redirects. Set `CASHBACK_PUBLIC_URL` when running the showcase script to report the correct public URL.

From the repository root with Node 24, run `./deploy/gcp/uat/verify.ps1` (optional `-NodePath` for a specific Node executable, `-SeedShowcase` for the idempotent showcase). It retrieves the gateway secret without printing it, clears the authentication environment variable after use, and creates clearly marked synthetic integration records.

For later releases, use a unique image tag and update both manifests. This prevents an ambiguous mutable-tag rollback. The service must expose only the password-protected gateway; never publish the mock-login API separately.

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
