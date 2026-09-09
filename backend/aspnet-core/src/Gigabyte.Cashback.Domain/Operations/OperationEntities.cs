using System;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.Auditing;

namespace Gigabyte.Cashback.Operations;

public class PaymentAttempt : CreationAuditedAggregateRoot<Guid>
{
    public Guid PaymentId
    {
        get; private set;
    }
    public int Number
    {
        get; private set;
    }
    public string Status { get; set; } = "Authorized";
    public string Reference { get; set; } = "";
    public string Reason { get; private set; } = "";
    protected PaymentAttempt()
    {
    }
    public PaymentAttempt(Guid id, Guid paymentId, int number, string reason) : base(id)
    {
        PaymentId = paymentId;
        Number = number;
        Reason = reason;
    }
}
public class ReconciliationEntry : CreationAuditedAggregateRoot<Guid>
{
    public Guid? PaymentId
    {
        get; private set;
    }
    public string ExternalPaymentId { get; private set; } = "";
    public string Reference { get; private set; } = "";
    public long AmountMinor
    {
        get; private set;
    }
    public string Currency { get; private set; } = "";
    public string Result { get; private set; } = "";
    public string MatchStatus { get; private set; } = "";
    public string Reason { get; private set; } = "";
    protected ReconciliationEntry()
    {
    }
    public ReconciliationEntry(Guid id, Guid? paymentId, string externalPaymentId, string reference, long amount, string currency, string result, string matchStatus, string reason) : base(id)
    {
        PaymentId = paymentId;
        ExternalPaymentId = externalPaymentId;
        Reference = reference;
        AmountMinor = amount;
        Currency = currency;
        Result = result;
        MatchStatus = matchStatus;
        Reason = reason;
    }
}

public class RuleReservation : CreationAuditedAggregateRoot<Guid>
{
    public Guid ClaimId
    {
        get; private set;
    }
    public string ScopeKey { get; private set; } = "";
    protected RuleReservation()
    {
    }
    public RuleReservation(Guid id, Guid claimId, string scopeKey) : base(id)
    {
        ClaimId = claimId;
        ScopeKey = scopeKey;
    }
}

[DisableAuditing]
public class ClaimRevision : CreationAuditedAggregateRoot<Guid>
{
    public Guid ClaimId
    {
        get; private set;
    }
    public string DataJson { get; private set; } = "{}";
    public string BankCiphertext { get; private set; } = "";
    public string Reason { get; private set; } = "";
    public long AmountMinor
    {
        get; private set;
    }
    protected ClaimRevision()
    {
    }
    public ClaimRevision(Guid id, ClaimRecord claim, string reason) : base(id)
    {
        ClaimId = claim.Id;
        DataJson = claim.DataJson;
        BankCiphertext = claim.BankCiphertext;
        Reason = reason;
        AmountMinor = claim.AmountMinor;
    }
}

public class Campaign : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = "";
    public string DraftJson { get; set; } = "{}";
    public int PublishedVersion
    {
        get; set;
    }
    public long BudgetMinor
    {
        get; set;
    }
    public long BufferMinor
    {
        get; set;
    }
    public long ReservedMinor
    {
        get; set;
    }
    public long ApprovedMinor
    {
        get; set;
    }
    public long PaidMinor
    {
        get; set;
    }
    protected Campaign()
    {
    }
    public Campaign(Guid id) : base(id) { }
    public void Reserve(long amount)
    {
        if (amount <= 0 || amount > BudgetMinor - BufferMinor - ReservedMinor - ApprovedMinor - PaidMinor)
            throw new BusinessException("Cashback:BudgetExceeded");
        ReservedMinor += amount;
    }
    public void Approve(long amount)
    {
        if (amount <= 0 || ReservedMinor < amount)
            throw new BusinessException("Cashback:InvalidLedger");
        ReservedMinor -= amount;
        ApprovedMinor += amount;
    }
    public void Release(long amount, bool approved)
    {
        if (amount <= 0 || (approved ? ApprovedMinor : ReservedMinor) < amount)
            throw new BusinessException("Cashback:InvalidLedger");
        if (approved)
            ApprovedMinor -= amount;
        else
            ReservedMinor -= amount;
    }
    public void Pay(long amount)
    {
        if (amount <= 0 || ApprovedMinor < amount)
            throw new BusinessException("Cashback:InvalidLedger");
        ApprovedMinor -= amount;
        PaidMinor += amount;
    }
}
public class CampaignVersion : CreationAuditedAggregateRoot<Guid>
{
    public Guid CampaignId
    {
        get; private set;
    }
    public int Version
    {
        get; private set;
    }
    public string SnapshotJson { get; private set; } = "{}";
    protected CampaignVersion()
    {
    }
    public CampaignVersion(Guid id, Guid campaignId, int version, string snapshot) : base(id) { CampaignId = campaignId; Version = version; SnapshotJson = snapshot; }
}
[DisableAuditing]
public class ClaimRecord : FullAuditedAggregateRoot<Guid>
{
    public Guid CampaignId
    {
        get; set;
    }
    public Guid? CampaignVersionId
    {
        get; set;
    }
    public Guid OwnerId
    {
        get; set;
    }
    public string Reference { get; set; } = "";
    public string DataJson { get; set; } = "{}";
    public string BankCiphertext { get; set; } = "";
    public string ReviewStatus { get; set; } = "Draft";
    public bool OnHold
    {
        get; set;
    }
    public string PaymentStatus { get; set; } = "None";
    public long AmountMinor
    {
        get; set;
    }
    public string Currency { get; set; } = "EUR";
    public DateTime? SubmittedAt
    {
        get; set;
    }
    protected ClaimRecord()
    {
    }
    public ClaimRecord(Guid id) : base(id) { }
}
public class SerialReservation : CreationAuditedAggregateRoot<Guid>
{
    public Guid ClaimId
    {
        get; private set;
    }
    public string SerialNumber { get; private set; } = "";
    protected SerialReservation()
    {
    }
    public SerialReservation(Guid id, Guid claimId, string serial) : base(id) { ClaimId = claimId; SerialNumber = serial; }
}
public class OperationEvent : CreationAuditedAggregateRoot<Guid>
{
    public Guid TargetId
    {
        get; private set;
    }
    public string Action { get; private set; } = "";
    public string Reason { get; private set; } = "";
    public string Actor { get; private set; } = "";
    public long AmountMinor
    {
        get; private set;
    }
    public string CorrelationId { get; private set; } = "";
    protected OperationEvent()
    {
    }
    public OperationEvent(Guid id, Guid target, string action, string reason, string actor, long amount, string correlation) : base(id) { TargetId = target; Action = action; Reason = reason; Actor = actor; AmountMinor = amount; CorrelationId = correlation; }
}
[DisableAuditing]
public class PaymentRecord : FullAuditedAggregateRoot<Guid>
{
    public Guid ClaimId
    {
        get; private set;
    }
    public Guid BatchId
    {
        get; private set;
    }
    public string BeneficiaryCiphertext { get; private set; } = "";
    public long AmountMinor
    {
        get; private set;
    }
    public string Currency { get; private set; } = "EUR";
    public string Status { get; set; } = "Authorized";
    public string ResultReference { get; set; } = "";
    public string ExportSha256 { get; set; } = "";
    protected PaymentRecord()
    {
    }
    public PaymentRecord(Guid id, Guid claimId, Guid batchId, string bank, long amount, string currency) : base(id) { ClaimId = claimId; BatchId = batchId; BeneficiaryCiphertext = bank; AmountMinor = amount; Currency = currency; }
}
