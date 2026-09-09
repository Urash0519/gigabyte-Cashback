using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;
using Volo.Abp.Auditing;

namespace Gigabyte.Cashback.Operations;

public class CampaignInput
{
    public string? ConcurrencyStamp
    {
        get; set;
    }
    [Required, StringLength(200)] public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Type { get; set; } = "Cashback";
    public string Status { get; set; } = "Draft";
    public string Market { get; set; } = "DE";
    public List<string> Markets { get; set; } = ["DE"];
    public List<string> Languages { get; set; } = ["en"];
    public string Currency { get; set; } = "EUR";
    public string TimeZone { get; set; } = "Europe/Berlin";
    public DateTime PurchaseStart
    {
        get; set;
    }
    public DateTime PurchaseEnd
    {
        get; set;
    }
    public DateTime ClaimStart
    {
        get; set;
    }
    public DateTime ClaimEnd
    {
        get; set;
    }
    public int WaitingDays
    {
        get; set;
    }
    public int MaxClaimsPerHousehold { get; set; } = 1;
    public string ExclusivityGroup { get; set; } = "";
    public int MaxClaimsPerPerson { get; set; } = 1;
    public int MaxItemsPerCategory { get; set; } = 1;
    public int ClaimLimit { get; set; } = 10000;
    public long BudgetMinor { get; set; } = 10000000;
    public long BufferMinor
    {
        get; set;
    }
    public bool AcceptingClaims { get; set; } = true;
    public string TermsVersion { get; set; } = "1";
    public string Terms { get; set; } = "";
    public string Privacy { get; set; } = "";
    public string Faq { get; set; } = "";
    public string Description { get; set; } = "";
    public string BannerUrl { get; set; } = "";
    public string SupportEmail { get; set; } = "";
    public List<ProductInput> Products { get; set; } = [];
    public List<RetailerInput> Retailers { get; set; } = [];
    public Dictionary<string, string> LegacyFields { get; set; } = [];
}
public class ProductInput
{
    public string Id { get; set; } = ""; public string Category { get; set; } = ""; public string Model { get; set; } = ""; public string Series { get; set; } = ""; public string Ean { get; set; } = ""; public long CashbackMinor
    {
        get; set;
    }
    public int QuantityLimit { get; set; } = 1;
}
public class RetailerInput
{
    public string Id { get; set; } = ""; public string Name { get; set; } = ""; public string Country { get; set; } = "DE"; public string Url { get; set; } = ""; public DateTime? ValidFrom
    {
        get; set;
    }
    public DateTime? ValidTo
    {
        get; set;
    }
}
public class CampaignDto
{
    public Guid Id
    {
        get; set;
    }
    public CampaignInput Data { get; set; } = new(); public int PublishedVersion
    {
        get; set;
    }
    public string ConcurrencyStamp { get; set; } = ""; public long ReservedMinor
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
    public long AvailableMinor
    {
        get; set;
    }
    public List<VersionDto> Versions { get; set; } = [];
}
public class VersionDto
{
    public Guid Id
    {
        get; set;
    }
    public int Version
    {
        get; set;
    }
    public DateTime CreatedAt
    {
        get; set;
    }
    public CampaignInput Data { get; set; } = new();
}
[DisableAuditing]
public class ClaimInput
{
    public Guid CampaignId
    {
        get; set;
    }
    [Required] public string Market { get; set; } = "DE";
    public string ChangeReason { get; set; } = "";
    public string Email { get; set; } = "yoyo.chen@gigabyte.com";
    public string ConfirmEmail { get; set; } = "yoyo.chen@gigabyte.com";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Title { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Address1 { get; set; } = "";
    public string Address2 { get; set; } = "";
    public string City { get; set; } = "";
    public string State { get; set; } = "";
    public string Postcode { get; set; } = "";
    public string ResidenceCountry { get; set; } = "DE";
    public string PurchaseCountry { get; set; } = "DE";
    public string BankCountry { get; set; } = "DE";
    public string Language { get; set; } = "en";
    public string InvoiceNumber { get; set; } = "";
    public DateTime PurchaseDate
    {
        get; set;
    }
    public long PurchaseAmountMinor
    {
        get; set;
    }
    public string RetailerId { get; set; } = "";
    public BankInput Bank { get; set; } = new();
    public List<ClaimItemInput> Items { get; set; } = [];
    public List<EvidenceDto> Attachments { get; set; } = [];
    public bool TermsAccepted
    {
        get; set;
    }
    public bool PrivacyAccepted
    {
        get; set;
    }
    public bool MarketingAccepted
    {
        get; set;
    }
    public Dictionary<string, string> LegacyFields { get; set; } = [];
}
[DisableAuditing]
public class BankInput
{
    public string BankCountry { get; set; } = ""; public string AccountHolderProfileType { get; set; } = "Individual"; public string AccountHolder { get; set; } = ""; public string BankName { get; set; } = ""; public string Iban { get; set; } = ""; public string Bic { get; set; } = ""; public string AccountNumber { get; set; } = ""; public string SortCode { get; set; } = "";
}
public class ClaimItemInput
{
    public DateTime? PurchaseDate
    {
        get; set;
    }
    public string RetailerId { get; set; } = ""; public string ProductId { get; set; } = ""; public string SerialNumber { get; set; } = ""; public string CheckNumber { get; set; } = ""; public long AmountMinor
    {
        get; set;
    }
}
public class EvidenceDto
{
    public Guid Id
    {
        get; set;
    }
    public string FileName { get; set; } = ""; public string Kind { get; set; } = "Invoice"; public string ProductId { get; set; } = ""; public string ScanStatus { get; set; } = "PendingManualReview"; public long Size
    {
        get; set;
    }
}
public class ClaimRevisionDto
{
    public Guid Id
    {
        get; set;
    }
    public DateTime CreatedAt
    {
        get; set;
    }
    public string Reason { get; set; } = ""; public long AmountMinor
    {
        get; set;
    }
    public ClaimInput Data { get; set; } = new();
}
public class ClaimDto
{
    public List<ClaimRevisionDto> Revisions { get; set; } = []; public Guid Id
    {
        get; set;
    }
    public string Reference { get; set; } = ""; public ClaimInput Data { get; set; } = new(); public string ReviewStatus { get; set; } = "Draft"; public bool OnHold
    {
        get; set;
    }
    public string PaymentStatus { get; set; } = "None"; public long AmountMinor
    {
        get; set;
    }
    public string Currency { get; set; } = "EUR"; public DateTime CreatedAt
    {
        get; set;
    }
    public DateTime? SubmittedAt
    {
        get; set;
    }
    public Guid? CampaignVersionId
    {
        get; set;
    }
    public List<EventDto> History { get; set; } = [];
}
public class ActionInput
{
    [Required] public string Action { get; set; } = ""; [Required, StringLength(2000)] public string Reason { get; set; } = ""; public string Value { get; set; } = ""; public string Reference { get; set; } = ""; public long? AmountMinor
    {
        get; set;
    }
    public string Currency { get; set; } = "";
}
public class ReasonInput
{
    [Required, StringLength(2000)] public string Reason { get; set; } = "";
}
public class PaymentInput : ReasonInput
{
    public List<Guid> ClaimIds { get; set; } = [];
}
public class PaymentDto
{
    public Guid Id
    {
        get; set;
    }
    public Guid ClaimId
    {
        get; set;
    }
    public Guid BatchId
    {
        get; set;
    }
    public string Status { get; set; } = ""; public long AmountMinor
    {
        get; set;
    }
    public string Currency { get; set; } = ""; public string ResultReference { get; set; } = ""; public string ExportSha256 { get; set; } = ""; public DateTime CreatedAt
    {
        get; set;
    }
}
public class EventDto
{
    public Guid Id
    {
        get; set;
    }
    public Guid TargetId
    {
        get; set;
    }
    public string Action { get; set; } = ""; public string Reason { get; set; } = ""; public string Actor { get; set; } = ""; public long AmountMinor
    {
        get; set;
    }
    public DateTime CreatedAt
    {
        get; set;
    }
}
public class ReportDto
{
    public DateTime GeneratedAt
    {
        get; set;
    }
    public string TimeZone { get; set; } = "UTC"; public string DateBasis { get; set; } = "SubmittedAt"; public List<ReportRowDto> Rows { get; set; } = [];
}
public class ReportRowDto
{
    public decimal? AverageReviewDays
    {
        get; set;
    }
    public decimal? MedianReviewDays
    {
        get; set;
    }
    public decimal? AveragePaymentDays
    {
        get; set;
    }
    public decimal? MedianPaymentDays
    {
        get; set;
    }
    public decimal? SupplementRate
    {
        get; set;
    }
    public int FirstReviewOverdue
    {
        get; set;
    }
    public string Dimension { get; set; } = ""; public string Value { get; set; } = ""; public string Currency { get; set; } = "EUR"; public int Claims
    {
        get; set;
    }
    public int Items
    {
        get; set;
    }
    public long AmountMinor
    {
        get; set;
    }
    public int Approved
    {
        get; set;
    }
    public int Rejected
    {
        get; set;
    }
    public decimal? ApprovalRate
    {
        get; set;
    }
    public int Paid
    {
        get; set;
    }
    public int OnHold
    {
        get; set;
    }
    public int SlaOverdue
    {
        get; set;
    }
}
[DisableAuditing]
public class EvidenceUploadInput
{
    public string FileName { get; set; } = ""; public string Kind { get; set; } = "Invoice"; public string ProductId { get; set; } = ""; public byte[] Content { get; set; } = [];
}
public class FileResultDto
{
    public string FileName { get; set; } = ""; public string ContentType { get; set; } = ""; public byte[] Content { get; set; } = [];
}
[DisableAuditing]
public class BankChangeInput : ReasonInput
{
    public BankInput Bank { get; set; } = new();
}
public class NotificationDto
{
    public Guid? ClaimId
    {
        get; set;
    }
    public string TemplateVersion { get; set; } = ""; public Guid Id
    {
        get; set;
    }
    public string RecipientMasked { get; set; } = ""; public string Subject { get; set; } = ""; public string Status { get; set; } = ""; public int Attempts
    {
        get; set;
    }
    public DateTime? ProcessedAt
    {
        get; set;
    }
}
public partial interface IOperationsAppService : IApplicationService
{
    Task<List<CampaignDto>> GetCampaignsAsync(bool admin = false);
    Task<CampaignDto> CreateCampaignAsync(CampaignInput input);
    Task<CampaignDto> SaveCampaignAsync(Guid id, CampaignInput input);
    Task<CampaignDto> CopyCampaignAsync(Guid id);
    Task<CampaignDto> PublishCampaignAsync(Guid id, ReasonInput input);
    Task<List<ClaimDto>> GetClaimsAsync(bool admin = false);
    Task<ClaimDto> CreateClaimAsync(ClaimInput input);
    Task<ClaimDto> SaveClaimAsync(Guid id, ClaimInput input);
    Task<ClaimDto> SubmitClaimAsync(Guid id);
    Task<ClaimDto> ClaimActionAsync(Guid id, ActionInput input);
    Task<EvidenceDto> UploadEvidenceAsync(Guid id, EvidenceUploadInput input);
    Task<FileResultDto> GetEvidenceAsync(Guid id, Guid fileId);
    Task<List<PaymentDto>> GetPaymentsAsync();
    Task<List<PaymentDto>> CreatePaymentsAsync(PaymentInput input);
    Task<PaymentDto> PaymentActionAsync(Guid id, ActionInput input);
    Task<FileResultDto> ExportPaymentAsync(Guid id);
    Task<ReportDto> GetReportsAsync(Guid? campaignId = null, string? market = null, DateTime? from = null, DateTime? to = null);
    Task<FileResultDto> ExportReportAsync(Guid? campaignId = null, string? market = null, DateTime? from = null, DateTime? to = null, string? dimension = null);
    Task<List<EventDto>> GetAuditAsync();
    Task<ClaimDto> ChangeBankAsync(Guid id, BankChangeInput input);
    Task<List<NotificationDto>> GetNotificationsAsync();
    Task SimulateNotificationAsync(Guid id);
}
