using System;

namespace Gigabyte.Cashback.Operations;

public class ClaimVersionCheckDto
{
    public Guid CurrentVersionId { get; set; }
    public int CurrentVersion { get; set; }
    public Guid LatestVersionId { get; set; }
    public int LatestVersion { get; set; }
    public bool NeedsUpdate { get; set; }
    public CampaignDto Campaign { get; set; } = new();
}

public class ApplyClaimVersionInput
{
    public Guid ExpectedLatestVersionId { get; set; }
}
