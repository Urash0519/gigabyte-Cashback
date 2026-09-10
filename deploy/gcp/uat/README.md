# GCP UAT deployment

Project `side-project-platform`, account `yoyo.chen@gigabyte.com`, region `asia-east1` (Taiwan). Sized for 3 testers using synthetic data for approximately 30 minutes. This environment has no bank API or real email sending.

## Resource inventory

| Service | Resource | Configuration / purpose |
|---|---|---|
| Cloud SQL | `cashback-uat-db` | PostgreSQL 17 Enterprise, `db-f1-micro`, single zone, 10GB SSD, no HA, automatic backup/PITR or storage expansion. Public IP with no authorized networks; Cloud SQL Auth Proxy connects from Cloud Run. |
| Artifact Registry | `cashback-uat` | Regional Docker images: API, migrator and combined public/admin gateway. |
| Cloud Build | On-demand builds | `cloudbuild.yaml`; source archive uses existing `side-project-platform_cloudbuild` bucket. |
| IAM | `cashback-uat@side-project-platform.iam.gserviceaccount.com` | Dedicated runtime. Cloud SQL Client, bucket-scoped Object Admin and access to only runtime secrets. |
| Cloud Run (planned until verified) | `cashback-uat` | One service, gateway + API containers; minimum 0, maximum 1 instance, concurrency 10; 2 vCPU / 1.25GiB total while requests run. |
| Cloud Run Job (planned until verified) | `cashback-uat-migrator` | 1 task, 1 vCPU / 1GiB, 0 retries; run before API deployment. |
| Cloud Storage (pending authorization) | `side-project-platform-cashback-uat-evidence` | Private ABP claim evidence; same region. |
| Cloud Storage (pending authorization) | `side-project-platform-cashback-uat-keys` | Private persistent ASP.NET Core Data Protection keys across instance restarts. |
| Secret Manager (pending authorization) | `cashback-uat-db`, `cashback-uat-encryption`, `cashback-uat-htpasswd` | Database connection, bank-field encryption and UAT gateway password hash. Runtime gets access only to these three secrets. |
| Secret Manager (pending authorization) | `cashback-uat-access` | UAT username/password for the owner to retrieve; no runtime access. |
| Cloud Logging / Monitoring | Existing project services | Build/run diagnostics and built-in metrics. No dedicated paid dashboard, load balancer, NAT, Redis or Kubernetes cluster. |

The existing `gigabyte-cashback` prototype service and unrelated project services are unchanged. No local database or personal claim data is copied to GCP.

## Application arrangement

The gateway serves public web at `/`, admin at `/admin/`, and proxies `/api/` to the ABP container over localhost. The gateway protects every request with HTTP Basic authentication over Cloud Run HTTPS. The API has no separate public service. Development button login remains behind this gate; all testers share the existing mock identity. Cookie and XSRF traffic stays on the same origin.

Credentials are never included in images, Git, README or URLs. `provision.ps1` is a **first-install script**, not a credential rotation script: do not rerun after partial creation without first inspecting existing resources. It writes temporary secrets only under ignored `.uat-test/gcp-secrets`. Do not change the encryption secret after bank data exists without a migration/rotation plan.

Schema upgrades use the existing ABP DbMigrator and EF migrations. This deployment adds no database schema, so no new migration is needed. UAT keys use the private bucket mounted at `/app/keys`; `DataProtection:KeyPath` is optional and local development behavior remains unchanged.

Verified build: `43b2b63d-f58f-441d-af6a-db89704fc3a8` **SUCCESS**, tag `uat-20260910`. API digest `89679de9e8201b2c201972497d86d522c741bf4c6654ab36e40fb0c3fb1feac1`; migrator `3933c1211d9af0ce3d5aaf1022c540a1000974a489c87c3b51409c20660fcfd2`; gateway `116739b6fedffc88efd8286c80199194a9a4e6489a0907e32db7cca387d2b343`. Local backend tests: 29 passed. Deployment/migration/HTTP verification remains pending IAM authorization; a successful image build is not a live site.

## Build and release

```powershell
gcloud builds submit . --config=deploy/gcp/uat/cloudbuild.yaml --substitutions=_TAG=uat-20260910 --project=side-project-platform --account=yoyo.chen@gigabyte.com
# After authorized resource/secret provisioning and database creation:
gcloud run jobs replace deploy/gcp/uat/migrator.yaml --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
gcloud run jobs execute cashback-uat-migrator --wait --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
# Deploy only after migration succeeds:
gcloud run services replace deploy/gcp/uat/service.yaml --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
```

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
