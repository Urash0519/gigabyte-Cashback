using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Gigabyte.Cashback.Operations;

public class CampaignCatalogEntry : AuditedAggregateRoot<Guid>
{
    public string Kind { get; private set; } = "";
    public string NormalizedKey { get; private set; } = "";
    public string DataJson { get; set; } = "";
    protected CampaignCatalogEntry() { }
    public CampaignCatalogEntry(Guid id, string kind, string key, string dataJson) : base(id)
    {
        Kind = kind;
        NormalizedKey = key.Trim().ToUpperInvariant();
        DataJson = dataJson;
    }
}
