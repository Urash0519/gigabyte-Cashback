using System;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp;
using Gigabyte.Cashback.Foundation;

namespace Gigabyte.Cashback.Notifications;

public class NotificationOutboxMessage : AuditedAggregateRoot<Guid>
{
    public string Channel { get; private set; } = string.Empty;
    public string RecipientMasked { get; private set; } = string.Empty;
    public string Subject { get; private set; } = string.Empty;
    public string Status { get; private set; } = string.Empty;
    public int Attempts { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public Guid? ClaimId { get; private set; }
    public string TemplateVersion { get; private set; } = "1";

    protected NotificationOutboxMessage()
    {
    }

    public NotificationOutboxMessage(Guid id, string channel, string recipientMasked, string subject, Guid? claimId = null, string templateVersion = "1")
        : base(id)
    {
        Channel = Check.NotNullOrWhiteSpace(channel, nameof(channel), 32);
        RecipientMasked = Check.NotNullOrWhiteSpace(recipientMasked, nameof(recipientMasked), FoundationConsts.MaxNameLength);
        Subject = Check.NotNullOrWhiteSpace(subject, nameof(subject), FoundationConsts.MaxNameLength);
        Status = "Pending";
        ClaimId = claimId;
        TemplateVersion = templateVersion;
    }

    public void MarkSimulated(DateTime processedAt)
    {
        Attempts += 1;
        Status = "Simulated";
        ProcessedAt = processedAt;
    }
}
