# GCP deployment preparation

These files are templates for a later, explicitly approved deployment. They have not been applied.

## Proposed GCP mapping

| Runtime component | GCP service |
| --- | --- |
| ABP HTTP API | Private Cloud Run service behind an external HTTPS load balancer |
| Public React web | Public Cloud Run service |
| Admin React web | IAM/IAP protected Cloud Run service |
| PostgreSQL | Private IP Cloud SQL for PostgreSQL |
| Claim evidence | Private Google Cloud Storage bucket through `Volo.Abp.BlobStoring.Google` |
| Secrets | Secret Manager, mounted as Cloud Run environment variables |
| EF migrations and seed | Cloud Run Job run once before an API revision is promoted |

The project starts as a layered monolith: one transactional database and one API deployment, with the public and admin React apps deployed independently. This keeps ABP module boundaries without adding distributed-system failure modes before scale requires them.

## Required preparation before any deployment

1. Replace every `REPLACE_*` value in `cloud-run/*.yaml` and decide final hostnames.
2. Create Artifact Registry, private Cloud SQL, private GCS bucket, secrets, and a least-privilege runtime service account.
3. Give the runtime identity Cloud SQL Client, Secret Manager Secret Accessor, and bucket-scoped Storage Object permissions only.
4. Build the React images with their final public, admin, and API URLs because Vite embeds these values at build time.
5. Run the migrator Job and confirm success before updating the API service.
6. Add IAM/IAP access for the admin service and grant unauthenticated invocation only to the public web service.
7. Choose a shared ASP.NET Core Data Protection key store before enabling cookie-based authentication or scaling the authenticated API above one instance.

`cloudbuild.yaml` builds and pushes images only. It deliberately does not deploy or modify GCP resources.
