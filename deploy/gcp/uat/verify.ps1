param([string]$NodePath = 'node', [switch]$SeedShowcase)
$ErrorActionPreference = 'Stop'
$env:CASHBACK_API_URL = 'https://cashback-uat-219894818230.asia-east1.run.app'
$env:CASHBACK_PUBLIC_URL = $env:CASHBACK_API_URL
$env:CASHBACK_UAT_BASIC_AUTH = ''
$env:CASHBACK_RUN_ID_TOKEN = ''
& $NodePath scripts/verify-uat-access.mjs
if ($LASTEXITCODE -ne 0) { throw 'Anonymous UAT entry checks failed' }
& $NodePath scripts/verify-operations.mjs
if ($LASTEXITCODE -ne 0) { throw 'UAT business checks failed' }
if ($SeedShowcase) {
    & $NodePath scripts/seed-showcase.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Showcase setup failed' }
}
