param([Parameter(Mandatory)][ValidateSet('start','stop','status')][string]$Action)
$ErrorActionPreference = 'Stop'
$common = @('--project=side-project-platform','--account=yoyo.chen@gigabyte.com','--quiet')
if ($Action -eq 'status') {
    & gcloud sql instances describe cashback-uat-db @common '--format=json(name,state,settings.activationPolicy,settings.tier,settings.dataDiskSizeGb)'
} else {
    $policy = if ($Action -eq 'start') { 'ALWAYS' } else { 'NEVER' }
    & gcloud sql instances patch cashback-uat-db "--activation-policy=$policy" @common
}
if ($LASTEXITCODE -ne 0) { throw "Cloud SQL $Action failed" }
