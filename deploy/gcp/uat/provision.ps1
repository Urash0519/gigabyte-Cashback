param([string]$Project = 'side-project-platform', [string]$Account = 'yoyo.chen@gigabyte.com')
$ErrorActionPreference = 'Stop'
function Invoke-Gcp {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    & gcloud @Arguments --project=$Project --account=$Account --quiet
    if ($LASTEXITCODE -ne 0) { throw "gcloud failed: $($Arguments[0..1] -join ' ')" }
}
$runtime = "cashback-uat@$Project.iam.gserviceaccount.com"
Invoke-Gcp @('projects','add-iam-policy-binding',$Project,"--member=serviceAccount:$runtime",'--role=roles/cloudsql.client','--format=none')
foreach ($suffix in @('evidence','keys')) {
    $bucket = "$Project-cashback-uat-$suffix"
    Invoke-Gcp @('storage','buckets','create',"gs://$bucket",'--location=asia-east1','--uniform-bucket-level-access','--public-access-prevention')
    Invoke-Gcp @('storage','buckets','add-iam-policy-binding',"gs://$bucket","--member=serviceAccount:$runtime",'--role=roles/storage.objectAdmin','--format=none')
}
# Random credentials never appear in command arguments, console output, source control or images.
$localSecrets = Join-Path (Get-Location) '.uat-test/gcp-secrets'
New-Item -ItemType Directory -Force -Path $localSecrets | Out-Null
function New-RandomSecret {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
}
$dbPassword = New-RandomSecret
$accessPassword = New-RandomSecret
$sha = [Security.Cryptography.SHA1]::Create()
$hash = [Convert]::ToBase64String($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($accessPassword)))
$sha.Dispose()
$values = @{
    'cashback-uat-db' = "Host=/cloudsql/${Project}:asia-east1:cashback-uat-db;Database=cashback;Username=cashback;Password=$dbPassword;Maximum Pool Size=10;Timeout=30"
    'cashback-uat-encryption' = New-RandomSecret
    'cashback-uat-htpasswd' = "uat:{SHA}$hash"
    'cashback-uat-access' = (@{username='uat';password=$accessPassword} | ConvertTo-Json -Compress)
}
[IO.File]::WriteAllText((Join-Path $localSecrets 'db-password'), $dbPassword)
foreach ($name in $values.Keys) {
    $secretFile = Join-Path $localSecrets $name
    [IO.File]::WriteAllText($secretFile, $values[$name])
    Invoke-Gcp @('secrets','create',$name,'--replication-policy=user-managed','--locations=asia-east1',"--data-file=$secretFile")
    if ($name -ne 'cashback-uat-access') {
        Invoke-Gcp @('secrets','add-iam-policy-binding',$name,"--member=serviceAccount:$runtime",'--role=roles/secretmanager.secretAccessor','--format=none')
    }
}
Write-Output 'Buckets and secrets provisioned. Finish database user creation after instance is RUNNABLE.'
