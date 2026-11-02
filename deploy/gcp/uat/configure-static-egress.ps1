param(
    [string]$Project = 'side-project-platform',
    [string]$Region = 'asia-east1',
    [string]$Account = 'yoyo.chen@gigabyte.com',
    [switch]$ApplyService
)

$ErrorActionPreference = 'Stop'
$networkName = 'cashback-uat-egress'
$subnetName = 'cashback-uat-egress'
$routerName = 'cashback-uat-egress'
$natName = 'cashback-uat-nat'
$addressName = 'cashback-uat-egress-ip'
$subnetRange = '10.250.0.0/26'
$common = @("--project=$Project", "--account=$Account", '--quiet', '--format=json')

function Invoke-Cloud {
    param([string[]]$Arguments)
    $raw = & gcloud @Arguments @common
    if ($LASTEXITCODE -ne 0) { throw "gcloud failed: $($Arguments -join ' ')" }
    if ($raw) { return ($raw | ConvertFrom-Json -AsHashtable) }
}

$network = @(Invoke-Cloud @('compute', 'networks', 'list', "--filter=name=$networkName"))
if ($network.Count -eq 0) {
    $null = Invoke-Cloud @('compute', 'networks', 'create', $networkName, '--subnet-mode=custom', '--bgp-routing-mode=regional', '--description=Dedicated low-usage Cashback UAT outbound network')
} elseif ($network.Count -ne 1 -or $network[0].autoCreateSubnetworks) {
    throw 'Existing egress network does not match the expected custom network.'
}

$subnets = @(Invoke-Cloud @('compute', 'networks', 'subnets', 'list', "--regions=$Region", "--filter=name=$subnetName"))
if ($subnets.Count -eq 0) {
    $null = Invoke-Cloud @('compute', 'networks', 'subnets', 'create', $subnetName, "--network=$networkName", "--region=$Region", "--range=$subnetRange", '--enable-private-ip-google-access', '--description=Cashback UAT Direct VPC egress only')
} elseif ($subnets.Count -ne 1 -or $subnets[0].ipCidrRange -ne $subnetRange -or -not $subnets[0].network.EndsWith("/networks/$networkName")) {
    throw 'Existing egress subnet differs from the expected network or CIDR.'
}

$routers = @(Invoke-Cloud @('compute', 'routers', 'list', "--regions=$Region", "--filter=name=$routerName"))
if ($routers.Count -eq 0) {
    $null = Invoke-Cloud @('compute', 'routers', 'create', $routerName, "--network=$networkName", "--region=$Region", '--description=Cashback UAT Cloud NAT control plane')
} elseif ($routers.Count -ne 1 -or -not $routers[0].network.EndsWith("/networks/$networkName")) {
    throw 'Existing egress router belongs to a different network.'
}

$addresses = @(Invoke-Cloud @('compute', 'addresses', 'list', "--regions=$Region", "--filter=name=$addressName"))
if ($addresses.Count -eq 0) {
    $null = Invoke-Cloud @('compute', 'addresses', 'create', $addressName, "--region=$Region", '--network-tier=PREMIUM', '--description=Reserved AORUS IP allowlist source; retain while partner allowlist is active')
}
$address = Invoke-Cloud @('compute', 'addresses', 'describe', $addressName, "--region=$Region")
if ($address.addressType -ne 'EXTERNAL' -or [System.Net.IPAddress]::Parse($address.address).AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { throw 'Expected a regional external IPv4 address.' }

$router = Invoke-Cloud @('compute', 'routers', 'describe', $routerName, "--region=$Region")
$existingNat = @($router.nats | Where-Object name -EQ $natName)
if ($existingNat.Count -eq 0) {
    $null = Invoke-Cloud @('compute', 'routers', 'nats', 'create', $natName, "--router=$routerName", "--region=$Region", "--nat-custom-subnet-ip-ranges=$subnetName", "--nat-external-ip-pool=$addressName", '--endpoint-types=ENDPOINT_TYPE_VM', '--enable-dynamic-port-allocation', '--min-ports-per-vm=128', '--max-ports-per-vm=1024')
} elseif ($existingNat.Count -ne 1 -or $existingNat[0].natIpAllocateOption -ne 'MANUAL_ONLY' -or @($existingNat[0].natIps).Count -ne 1 -or -not $existingNat[0].natIps[0].EndsWith("/addresses/$addressName")) {
    throw 'Existing NAT differs from the expected single manually reserved IP.'
}

$router = Invoke-Cloud @('compute', 'routers', 'describe', $routerName, "--region=$Region")
$address = Invoke-Cloud @('compute', 'addresses', 'describe', $addressName, "--region=$Region")
$nat = @($router.nats | Where-Object name -EQ $natName)[0]
if ($nat.natIpAllocateOption -ne 'MANUAL_ONLY' -or @($nat.natIps).Count -ne 1 -or $address.status -ne 'IN_USE') { throw 'Reserved IP is not attached to the expected NAT.' }

$report = [ordered]@{
    configured_at = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(8)).ToString('o')
    project = $Project
    region = $Region
    network = $networkName
    subnet = $subnetName
    subnet_cidr = $subnetRange
    router = $routerName
    nat = $natName
    address_resource = $addressName
    public_ipv4 = $address.address
    allowlist_cidr = "$($address.address)/32"
    nat_configuration = $nat
    service_updated = $false
}

if ($ApplyService) {
    $before = Invoke-Cloud @('run', 'services', 'describe', 'cashback-uat', "--region=$Region")
    $annotations = $before.spec.template.metadata.annotations
    if ($annotations['autoscaling.knative.dev/minScale'] -ne '0' -or $annotations['autoscaling.knative.dev/maxScale'] -ne '1') { throw 'Service no longer has the expected low-usage settings; inspect before applying.' }
    $updated = Invoke-Cloud @('run', 'services', 'update', 'cashback-uat', "--region=$Region", "--network=$networkName", "--subnet=$subnetName", '--vpc-egress=all-traffic')
    $report.service_updated = $true
    $report.ready_revision = $updated.status.latestReadyRevisionName
}

$outputDirectory = Join-Path (Get-Location) '.uat-test/gcp-static-egress'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $outputDirectory 'network.json') -Encoding utf8
$report | ConvertTo-Json -Depth 12
