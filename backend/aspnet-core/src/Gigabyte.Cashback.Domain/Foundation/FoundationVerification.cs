using System;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp;

namespace Gigabyte.Cashback.Foundation;

public class FoundationVerification : AuditedAggregateRoot<Guid>
{
    public string CheckKey { get; private set; } = string.Empty;
    public string Status { get; private set; } = string.Empty;
    public string Detail { get; private set; } = string.Empty;
    public DateTime CheckedAt { get; private set; }

    protected FoundationVerification()
    {
    }

    public FoundationVerification(Guid id, string checkKey, string status, string detail, DateTime checkedAt)
        : base(id)
    {
        CheckKey = Check.NotNullOrWhiteSpace(checkKey, nameof(checkKey), FoundationConsts.MaxNameLength);
        Status = Check.NotNullOrWhiteSpace(status, nameof(status), 32);
        Detail = Check.NotNullOrWhiteSpace(detail, nameof(detail), FoundationConsts.MaxDetailLength);
        CheckedAt = checkedAt;
    }
}
