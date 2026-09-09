$ErrorActionPreference = 'Stop'

$endpoints = @(
    @{ Name = 'Public React'; Url = 'http://localhost:5173/' },
    @{ Name = 'Admin React'; Url = 'http://localhost:5174/' },
    @{ Name = 'ABP health'; Url = 'http://localhost:44305/health' },
    @{ Name = 'Foundation API'; Url = 'http://localhost:44305/api/foundation/overview' }
)

foreach ($endpoint in $endpoints) {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $endpoint.Url
    [pscustomobject]@{
        Service = $endpoint.Name
        Status  = $response.StatusCode
        Url     = $endpoint.Url
    }
}
