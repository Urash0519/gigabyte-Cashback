# First installation only, after provision.ps1 and SQL instance creation.
$ErrorActionPreference = 'Stop'
$dbPassword = [IO.File]::ReadAllText((Join-Path (Get-Location) '.uat-test/gcp-secrets/db-password'))
$accessToken = & gcloud auth print-access-token --account=yoyo.chen@gigabyte.com
if ($LASTEXITCODE -ne 0) { throw 'Unable to obtain deployment credentials' }
$headers = @{Authorization="Bearer $accessToken"}
$endpoint = 'https://sqladmin.googleapis.com/sql/v1beta4/projects/side-project-platform/instances/cashback-uat-db'
$user = @{name='cashback';password=$dbPassword} | ConvertTo-Json -Compress
$result = Invoke-RestMethod -Method Post -Uri "$endpoint/users" -Headers $headers -ContentType 'application/json' -Body $user
Write-Output "Database user operation: $($result.name)"
& gcloud sql databases create cashback --instance=cashback-uat-db --project=side-project-platform --account=yoyo.chen@gigabyte.com --quiet
if ($LASTEXITCODE -ne 0) { throw 'Database creation failed' }
$dbPassword = $null
$accessToken = $null
