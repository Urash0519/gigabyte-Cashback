# Same-campaign exclusivity correction

The Q1 UAT campaign allowed ten claims per person, but submitting a second claim failed with “An exclusive campaign application already reserves this applicant.” The application-level check correctly excluded the same campaign; the unique owner/email reservation check did not.

Claims in the same campaign now share the existing unique group/owner and group/email reservations. Per-person, household, product, serial-number and budget checks still apply. Another campaign in the same group remains blocked. Group names use the same trimmed, case-insensitive normalization in both checks.

When a claim is cancelled, rejected or changes its email during supplementation, each reservation transfers to another active same-campaign claim that still needs that scope. A reservation is deleted only when no matching active claim remains. The existing unique database index still arbitrates competing reservations, and campaign/claim concurrency checks remain in place. Existing reservations work without migration or data cleanup.

## Validation

The new regression first reproduced the original failure. After the fix, `dotnet test backend/aspnet-core/Gigabyte.Cashback.slnx --no-restore` passed all 80 tests: 5 domain, 22 application and 53 EF/application integration tests.

Regression coverage includes:

- Multiple same-campaign claims up to the configured person and household limits.
- Cross-campaign blocking, including equivalent group names with different casing/whitespace.
- Transferring shared reservations on cancellation and rejection, then releasing them after the last claim closes.
- Preserving another claim's old-email reservation when the original reservation holder corrects its email.
- Supplement resubmission without double-reserving budget.

`scripts/verify-exclusivity-uat.mjs` exercises the real HTTP/API/PostgreSQL/evidence/AORUS flow using two explicitly hidden synthetic campaigns. It closes all test claims, releases their budgets and archives the campaigns. It does not submit or alter existing user claims and creates no payments.

Run the manual check with Node 22 or newer, `CASHBACK_API_URL` set to the target deployment, and optionally `CASHBACK_EXCLUSIVITY_REPORT` set to an output JSON path. `AORUS_TEST_EMAIL` can override the existing known test member used by other UAT verification scripts.

## GCP deployment

The fix is deployed to `cashback-uat-00021-nov` with 100% traffic. [Deployment evidence](Exclusive-Campaign-Deployment-2026-11-03.json) records the exact build, API digest, preserved settings and post-promotion checks. [Live regression evidence](Exclusive-Campaign-Regression-2026-11-03.json) records all eight successful business-flow checks and cleanup.

Two earlier live attempts stopped at transient AORUS unavailability and cleaned up. The final complete run passed without retries. The manual regression script allows up to two retries only for that exact external-service-unavailable response on submission; business-rule rejections are never retried. All six test campaigns across the three attempts are archived and all twelve test claims are closed with no remaining budget or payment. The existing Q1 draft and submitted claim were read for verification without changing them.
