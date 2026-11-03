# AORUS membership integration

The GCP UAT API uses fixed outbound IPv4 **34.81.30.245** (`34.81.30.245/32`). Credentials are stored in Secret Manager; the credential-bearing partner PDF is retained locally and is not included in the Git commit.

The backend obtains a password-grant Bearer token from `POST /oauth/request` using form-encoded `grant_type`, `client_id`, `client_secret`, `username`, and `password`. It then sends buffered JSON with a fixed Content-Length to `POST /api/eu_promotion/check_member_exist`:

```json
{"eu_promotion":{"UserEmail":"test@gmail.com"}}
```

The spaces surrounding `eu_promotion` in the PDF are incorrect. A controlled comparison also confirmed that this legacy API treats chunked JSON as an empty body (business code 2000). Code 1000 / Success with a matching returned email passes; 2002 / Failed rejects the member. Unknown, inconsistent, malformed, transport and provider errors block claim submission. The opaque `Name`, `User_ID` and `AUID` values are not used to establish applicant identity or eligibility.

Tokens are cached per backend process and refreshed on demand before expiry. HTTP 401 or business code 2098 (`StatusCode` or string `Status_code`) triggers one replacement and one lookup retry. Concurrent requests share token acquisition. No periodic job or minimum running instance is required.

## AORUS test member emails

`test@gmail.com` is the account supplied in the API document and remains the default for automated checks. Its membership lookup passed the GCP verification on 2026-11-02.

The following additional test emails were supplied by AORUS and relayed by the user on **2026-11-03**. They are available for manual and integration testing. Verification dates and outcomes are maintained below.

| Test email | Source / status |
|---|---|
| vincent.chu@gigabyte.com | AORUS-provided; awaiting individual verification |
| peter.nien@gigabyte.com | AORUS-provided; awaiting individual verification |
| yang71030@gmail.com | AORUS-provided; awaiting individual verification |
| yang71030@yahoo.com | 2026-11-03 GCP verified: member found; `Result.Name` is an empty string, so the review UI displays “Name not returned” |
| lyana.lee.gigabyte@gmail.com | AORUS-provided; awaiting individual verification |
| cl4rmp404@gmail.com | AORUS-provided; awaiting individual verification |
| lyanalee1210@gmail.com | AORUS-provided; awaiting individual verification |
| ryan.lin@gigabyte.com | AORUS-provided; awaiting individual verification |
| cl4rmp903@gmail.com | AORUS-provided; awaiting individual verification |

Set `AORUS_TEST_EMAIL` to select a different account when running the live verification scripts. Record the date and outcome here when an individual address is checked. A successful membership lookup is reference data; it does not verify ownership of the mailbox.

## Reviewer member reference

Administrators with claim-review permission can call `POST /api/operations/claims/{claimId}/aorus-member`. The server uses the claim's saved email and returns only `email`, nullable `isMember`, the provider's exact `Result.Name` string (or null), and `checkedAt`. The request has no editable email input and sends `Cache-Control: no-store`. It is not available to applicants and does not change the claim, budget or required review checks. Existing submitted claims can use it without re-submission or migration.

The Claims detail view displays the AORUS name and membership status separately from the applicant's own name, along with the queried email and time. It shows loading, missing-member, missing-name, disabled and retryable-error states. Provider names are displayed as returned, without decoding or treating them as evidence of a name match. Switching cases aborts the previous lookup and clears its result. Names and provider identifiers are not added to the applicant email-verification response.

## Early frontend check

An authenticated applicant can check an unsaved email for their own editable claim:

```http
POST /api/operations/claims/{claimId}/verify-email
Content-Type: application/json

{"email":"test@gmail.com"}
```

```json
{"email":"test@gmail.com","isMember":true}
```

`isMember=false` means no AORUS member was found. `isMember=null` is reserved for local mock mode where the integration is disabled; the frontend does not display it as verified. The endpoint does not update the claim, audit the email payload, reserve budget or return partner credentials, tokens, names or IDs.

The applicant field checks after 600ms without input and on blur, shares duplicate pending requests, aborts replaced requests, and immediately hides results for a previous email. It displays checking, found, not found and unavailable states with English/Traditional Chinese translations and accessible status text. Unknown members and verification failures block Save and continue on the applicant step; Save draft remains available. Local mock mode permits continuing while clearly showing that membership was not checked. Final submission and supplement resubmission still perform their own server-side lookup. Membership existence does not verify ownership of the mailbox and sends no OTP.

## Verification

- `dotnet test backend/aspnet-core/Gigabyte.Cashback.slnx`
- Build both frontend applications.
- `node scripts/verify-aorus-email-ui.mjs`: production-bundle browser tests using isolated API fixtures; requires the `playwright` module. `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_EXECUTABLE_PATH` can select an existing installation.
- `node scripts/verify-claims-review-ui.mjs`: thirteen isolated browser checks for both admin presentations at 1920/1440/768/375px, member-reference states/retry, Chinese labels and stale-response protection. Creates no UAT claims. See [browser verification](Reviewer-Name-UI-Verification-2026-11-03.json).
- `CASHBACK_API_URL=<uat-url> AORUS_BROWSER_CHECK=1 node scripts/verify-aorus-uat.mjs`: actual GCP/AORUS flow, including early checks and live browser feedback. It creates a hidden synthetic campaign, cancels its claim, releases budget and archives the campaign after testing; no payment is created. PowerShell users should set these environment variables with `$env:` first.

The JSON verification records in this folder redact credentials/tokens and member identifiers. Deployment configuration and current release details are in [the GCP UAT record](../../deploy/gcp/uat/README.md).
