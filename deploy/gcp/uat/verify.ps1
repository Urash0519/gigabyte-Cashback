param([string]$NodePath = 'node', [switch]$SeedShowcase)
$ErrorActionPreference = 'Stop'
try {
    $credentialJson = & gcloud secrets versions access 1 --secret=cashback-uat-access --project=side-project-platform --account=yoyo.chen@gigabyte.com
    if ($LASTEXITCODE -ne 0) { throw 'Unable to retrieve UAT access secret' }
    $credential = $credentialJson | ConvertFrom-Json
    $env:CASHBACK_UAT_BASIC_AUTH = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$($credential.username):$($credential.password)"))
    $env:CASHBACK_API_URL = 'https://cashback-uat-219894818230.asia-east1.run.app'
    $env:CASHBACK_PUBLIC_URL = $env:CASHBACK_API_URL
    & $NodePath scripts/verify-uat-access.mjs
    if ($LASTEXITCODE -ne 0) { throw 'UAT gateway checks failed' }
    & $NodePath scripts/verify-operations.mjs
    if ($LASTEXITCODE -ne 0) { throw 'UAT business checks failed' }
    if ($SeedShowcase) {
        & $NodePath scripts/seed-showcase.mjs
        if ($LASTEXITCODE -ne 0) { throw 'Showcase setup failed' }
    }
} finally {
    $credentialJson = $null
    $credential = $null
    Remove-Item Env:CASHBACK_UAT_BASIC_AUTH -ErrorAction SilentlyContinue
}
