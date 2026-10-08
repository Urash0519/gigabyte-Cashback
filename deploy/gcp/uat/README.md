# GCP UAT deployment

Deployed and verified **2026-09-10**. Project `side-project-platform`, account `yoyo.chen@gigabyte.com`, region `asia-east1` (Taiwan). Sized for 3 testers using synthetic data for approximately 30 minutes. This environment has no bank API or real email sending.

## Resource inventory

| Service | Resource | Configuration / purpose |
|---|---|---|
| Cloud SQL | `cashback-uat-db` | PostgreSQL 17 Enterprise, `db-f1-micro`, single zone, 10GB SSD, no HA, automatic backup/PITR or storage expansion. Public IP with no authorized networks; Cloud SQL Auth Proxy connects from Cloud Run. |
| Artifact Registry | `cashback-uat` | Regional Docker images: API, migrator and combined public/admin gateway. |
| Cloud Build | On-demand builds | `cloudbuild.yaml`; source archive uses existing `side-project-platform_cloudbuild` bucket. |
| IAM | `cashback-uat@side-project-platform.iam.gserviceaccount.com` | Dedicated runtime. Cloud SQL Client, bucket-scoped Object Admin and access to only runtime secrets. |
| Cloud Run | `cashback-uat` | One service, gateway + API containers; minimum 0, maximum 1 instance, concurrency 10; 2 vCPU / 1.25GiB total while requests run. Revision `cashback-uat-00010-zls`, 100% traffic. |
| Cloud Run Job | `cashback-uat-migrator` | 1 task, 1 vCPU / 1GiB, 0 retries; successful P0 execution `cashback-uat-migrator-7bgwh`. |
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
- Q1 simulation `3a239cbc-1de2-f379-be37-11852cfc5d0c`, slug `q1-build-beyond-uat-v1`, version 2: 59 products / 46 retailers / DE, FR, IT, ES, NL / EUR. Purchase dates 2026-07-27 to 2026-11-09; claim dates 2026-08-10 to 2026-12-09, UTC. These are shifted UAT dates, not historical Q1 eligibility.

## Application arrangement

The gateway serves public web at `/`, admin at `/admin/`, and proxies `/api/` to the ABP container over localhost. The gateway is publicly accessible over Cloud Run HTTPS without Basic authentication. The API has no separate public service. The explicit development-login button remains; all testers share the existing mock identity. Cookie and XSRF traffic stays on the same origin.

Credentials are never included in images, Git, README or URLs. `provision.ps1` is a **first-install script**, not a credential rotation script: do not rerun after partial creation without first inspecting existing resources. It writes temporary secrets only under ignored `.uat-test/gcp-secrets`. Do not change the encryption secret after bank data exists without a migration/rotation plan.

Temporary local credential files were removed after successful deployment; Secret Manager retains the authoritative copies. SQL is currently running (`activationPolicy=ALWAYS`) so UAT is ready to use; stop it after the actual test session using the commands below.

Schema upgrades use the existing ABP DbMigrator and EF migrations. The Q1 P0 release adds migration `20260910084651_CampaignConfigurationCatalog` for independent product/retailer master metadata; existing campaign, claim and payment tables are preserved. UAT keys use the private bucket mounted at `/app/keys`; `DataProtection:KeyPath` is optional and local development behavior remains unchanged.

Verified build: `43b2b63d-f58f-441d-af6a-db89704fc3a8` **SUCCESS**, tag `uat-20260910`. API digest `89679de9e8201b2c201972497d86d522c741bf4c6654ab36e40fb0c3fb1feac1`; migrator `3933c1211d9af0ce3d5aaf1022c540a1000974a489c87c3b51409c20660fcfd2`; gateway `116739b6fedffc88efd8286c80199194a9a4e6489a0907e32db7cca387d2b343`. Local backend tests: 29 passed. Migration completed successfully in 18.2 seconds. Cloud HTTP integration: 24 passed, including real Cloud SQL transactions and GCS evidence upload. That initial release used Basic authentication. The later open-UAT release below supersedes that entry policy.

## Open UAT / admin language release

Gateway build `62f35b35-a8b0-43a5-9c92-e47e5423718d` succeeded, image tag `uat-20260910-open-zh`, digest `sha256:d4addcdd719b4cd2e55aca65ad1c6989fa415ed53ef9026e9f60d8a5364c76be`. API and database are unchanged; no migration needed for this frontend/configuration release.

Revision `cashback-uat-00002-w6n` passed 24 cloud business-flow checks and anonymous access checks for both apps, health and public API routes without Authorization/cookies. No Basic challenge is returned. Browser checks confirmed Chinese login/navigation, campaign fields, reports and payments/notifications, preservation of an unsaved campaign name when switching language, and language persistence after reload. Retired gateway secret versions were disabled and their runtime accessor binding removed after rollout.

## Q1 P0 release

Final ready revision: `cashback-uat-00005-j57`, 100% traffic, 2026-09-10. No new infrastructure services, secrets or permissions were added. Migration `20260910084651_CampaignConfigurationCatalog` completed through job execution `cashback-uat-migrator-7bgwh` in 22.17 seconds, before API rollout. It only adds master metadata; existing snapshots, claims and payment ledgers remain intact.

| Image | Tag | Digest |
|---|---|---|
| API | `uat-20260910-q1-p0` | `sha256:260dbb2408707ee1a4cb4ab6fc01267f48ba83fe249d95e4af4549a41a40b69c` |
| Migrator | `uat-20260910-q1-p0` | `sha256:111167db61c008774338ac25f601824f30b8418201830d5679ad2dcc03831f13` |
| Gateway | `uat-20260910-q1-p0-final` | `sha256:42c337ddca3f9b3649b41dd516b154e73f1ef3d472a765f175b125655f35c48c` |

Build `e3b44e02-1e33-40c7-a8a9-1890b199a077` produced API/migrator; final gateway build `63cf3d9a-07d0-4390-9cf7-7650238a4c0e` includes the Q1 template, short simulation summary and legacy-rule display compatibility. Both succeeded. Intermediate gateway builds are superseded by the final digest above.

Verification: 42 backend tests, 13 CSV/JSON/legacy-rule tests, local Docker builds, 24 local and cloud business checks, 12 local and cloud configuration/authorization checks. The final revision also passed anonymous entry checks, exact served-Q1-template comparison with repository source, and idempotent Q1 seed rerun (retained version 2). Browser checks confirmed template loading under `/admin/`, batch draft operations, public Q1 imagery and an old campaign's effective household limit of 3 even when its canonical default was 1; public/admin console error lists were empty. See [P0 verification](../../../docs/P0-Verification.md).

Q1 version 2 only shortens the simulated summary; original conditions remain in Terms/FAQ. The downloadable reference retains original March/April 2026 dates. The public layout remains fixed, so its existing image-cover behavior can crop the source banner; this is not a pixel-identical landing-page rebuild. JSON transfers all settings and asset URLs, not binary assets or database records.

Rollback: route traffic to a previously verified revision while investigating; the additive catalog table can remain. Do not drop the new table or run a down migration on the shared database as part of a UI rollback. Do not change bank-encryption secrets. Preserve the existing open-UAT access decision.

## Build and release

### Reference navigation follow-up — 2026-10-08

Cloud Build `ec098b34-f58d-4279-a881-8097b8b584a9` succeeded. Gateway tag `uat-20261008-reference-navigation`, digest `sha256:516697a265750a6053bdbac71528c79b3576a725ccafcd1471478b356b632095`. Revision `cashback-uat-00010-zls` became Ready at 16:30 Asia/Taipei and serves 100% traffic. Previous revision `cashback-uat-00009-s96` is the immediate rollback target. API, database and access configuration are unchanged.

Reference navigation now scrolls to the selected content instead of the top artwork, with keyboard focus and reduced-motion support. Initial promotion visits retain the hero. Local navigation checks passed at 1440/768/375px, including repeated same-page clicks, back/forward, draft leave protection and admin menu closing. Both frontend production builds and anonymous-entry/session checks passed. See [audit](../../../docs/User-Reference-UX-Audit.md).

### Reference UI/UX follow-up — 2026-10-08

Final Cloud Build `eb85164a-219e-486b-b1fe-8cb8181b7ad1` succeeded. Gateway tag `uat-20261008-reference-ux-final`, digest `sha256:aac12539ead7a3d43932ed94399ceb074a83cf5aa2a6cdff3a11ed4b453fbc87`. Revision `cashback-uat-00009-s96` became ready at 15:55 Asia/Taipei and receives 100% traffic. The API image and database configuration are unchanged. The original reference UI release `cashback-uat-00007-5jw` remains the pre-change rollback revision.

Changes are limited to the reference presentation: mobile/tablet reflow, readable colors and labels, scoped operational table scrolling, keyboard navigation, report error/retry states, and unsaved draft protection including product button edits. See [UI/UX findings, files and verification](../../../docs/User-Reference-UX-Audit.md). Local and Cloud Build production builds passed. Original CSS hashes remain unchanged. Live public and admin reference pages were checked at 1440/768/375px; the anonymous entry verification script passed all eight routes and preserved the admin-session requirement.

### 2026-10-08 user reference UI release

Cloud Build `25e8a18e-cddb-4137-a347-e441d7f80a85` succeeded. Gateway tag `uat-20261008-reference-ui`, digest `sha256:3cbda3086656cf59d97dcb53fae91f29a7430882811f08a142a037c73aaa66b7`. Cloud Run revision `cashback-uat-00007-5jw` became ready at 14:37 Asia/Taipei and received 100% traffic at that release. API remains on the verified `uat-20261002-review-ux` image (`sha256:0a9ea22394477e94af34663dc5a897bd0e8d74a629b26ea49a680617598b52d7`); no migration, secret, access policy or database configuration change was required.

New independent routes: `/reference/` (26Q1 public design), `/admin/reference/` (Benamic report design), and `/compare/` (four version links). Original `/` and `/admin/` applications and styles are retained. The public reference entry selects the existing Q1 simulation and stores the chosen campaign/market in its hash. Both presentations use the same business APIs and records. See [scope and limitations](../../../docs/User-Reference-UI.md) and [backend feature comparison](../../../docs/Benamic-Backend-Gap-Analysis.md).

Verification:

- Both frontend TypeScript checks and production builds passed locally and inside Cloud Build. Reference code/CSS is lazy loaded; original public/admin CSS hashes remain `index-8JaS8b_Q.css` / `index-CNIXRhKk.css`.
- `scripts/verify-uat-access.mjs`: eight anonymous route/API checks plus the separate admin-session authorization check passed. Built JavaScript assets load on all four application entries and the comparison hub contains all four links.
- Browser: live Q1 campaign/products/rewards, category selection and search, FAQ navigation, development access, create/save/reload/lookup of a named synthetic `ReferenceUI Verification` draft, campaign dashboard, scoped summaries, market filter, detailed report column visibility, and existing review entry. No bank transaction or real notification was performed.
- Cloud summary CSV downloaded successfully: one purchase-country row, EUR, one submitted claim/two items, matching the screen; metadata and operational columns remain the existing API export. The source fixture was not edited.
- Cloud browser console errors/warnings were empty. Original routes show the current navigation and load only the original CSS; no reference stylesheet was present on them.
- Phone-width checks returned `clientWidth = scrollWidth = 375` for public Q1 and admin detail views; tables retain their own horizontal scroll containers.

Rollback: restore traffic to `cashback-uat-00006-crp`; no down migration is necessary. Cloud SQL remains running for UAT. This release updates only the gateway presentation and does not complete the feature gaps listed in the comparison document.

### 2026-10-02 claim and review usability release

Commit `9184c2c` is on `origin/main`. Build `941f68e8-9881-45e5-8b4f-32b19820a6e6` succeeded with tag `uat-20261002-review-ux`. Migration execution `cashback-uat-migrator-7n86c` succeeded; this release changes JSON claim data but adds no database schema migration. Cloud Run revision `cashback-uat-00006-crp` serves 100% of traffic.

| Image | Digest |
|---|---|
| API | `sha256:0a9ea22394477e94af34663dc5a897bd0e8d74a629b26ea49a680617598b52d7` |
| Migrator | `sha256:aa36e33ea5768604277d134df722063315d84971a96d28f59f34ed8835e9e933` |
| Gateway | `sha256:f13f248aaf65deedb891b012726a8234397bc5b15c70b23997dbf80c5c5667e0` |

Changes: product-line evidence association and orphan removal, early category/product quantity feedback, inline evidence preview with a separate download action, batch recording of seven review checks, and submission-round history sections. Existing claim JSON remains readable; legacy evidence is associated with a unique matching product line when a draft is saved. Local verification passed 44 .NET tests, both frontend typechecks/builds, Docker health, and 25 HTTP business checks. Cloud verification passed six anonymous/access checks, 25 business checks, and 12 configuration/authorization checks.

Rollback: route traffic to revision `cashback-uat-00005-j57` if required. No database down migration is needed. Claims saved in the new format retain item IDs in their JSON.

```powershell
# For the next release, choose a NEW unique tag and update both manifests.
gcloud builds submit . --config=deploy/gcp/uat/cloudbuild.yaml --substitutions=_TAG=YOUR_NEW_TAG --project=side-project-platform --account=yoyo.chen@gigabyte.com
gcloud run jobs replace deploy/gcp/uat/migrator.yaml --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
gcloud run jobs execute cashback-uat-migrator --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com --wait
# Only deploy traffic after migration succeeds:
gcloud run services replace deploy/gcp/uat/service.yaml --region=asia-east1 --project=side-project-platform --account=yoyo.chen@gigabyte.com
```

`scripts/verify-operations.mjs`, `scripts/verify-uat-access.mjs` and `scripts/seed-showcase.mjs` accept `CASHBACK_API_URL`. Current UAT verification uses no gateway password or IAM token. The optional authentication helper remains compatible with private/protected environments; it only adds supplied credentials to the configured API origin and refuses redirects. Set `CASHBACK_PUBLIC_URL` when running the showcase script to report the correct public URL.

From the repository root with Node 24, run `./deploy/gcp/uat/verify.ps1` (optional `-NodePath`, `-SeedShowcase`, `-SeedQ1`). It verifies anonymous entry, 24 business checks and 12 configuration/authorization checks through the development-login flow. Q1 seeding is idempotent and does not overwrite operator edits. The settings template is available at `/admin/templates/q1-campaign.json`; its dates remain historical.

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
