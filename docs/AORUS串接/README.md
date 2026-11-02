# AORUS membership integration

The GCP UAT API uses fixed outbound IPv4 **34.81.30.245** (`34.81.30.245/32`). Credentials are stored in Secret Manager; the credential-bearing partner PDF is retained locally and is not included in the Git commit.

The backend obtains a password-grant Bearer token from `POST /oauth/request` using form-encoded `grant_type`, `client_id`, `client_secret`, `username`, and `password`. It then sends buffered JSON with a fixed Content-Length to `POST /api/eu_promotion/check_member_exist`:

```json
{"eu_promotion":{"UserEmail":"test@gmail.com"}}
```

The spaces surrounding `eu_promotion` in the PDF are incorrect. A controlled comparison also confirmed that this legacy API treats chunked JSON as an empty body (business code 2000). Code 1000 / Success with a matching returned email passes; 2002 / Failed rejects the member. Unknown, inconsistent, malformed, transport and provider errors block claim submission. The opaque `Name`, `User_ID` and `AUID` values are not used to establish applicant identity or eligibility.

Tokens are cached per backend process and refreshed on demand before expiry. HTTP 401 or business code 2098 (`StatusCode` or string `Status_code`) triggers one replacement and one lookup retry. Concurrent requests share token acquisition. No periodic job or minimum running instance is required.

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
- `CASHBACK_API_URL=<uat-url> AORUS_BROWSER_CHECK=1 node scripts/verify-aorus-uat.mjs`: actual GCP/AORUS flow, including early checks and live browser feedback. It creates a hidden synthetic campaign, cancels its claim, releases budget and archives the campaign after testing; no payment is created. PowerShell users should set these environment variables with `$env:` first.

The JSON verification records in this folder redact credentials/tokens and member identifiers. Deployment configuration and current release details are in [the GCP UAT record](../../deploy/gcp/uat/README.md).
