using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace Gigabyte.Cashback.Operations;

public class ReconciliationInput
{
    public string PaymentId { get; set; } = "";
    [Required] public string Reference { get; set; } = "";
    public long AmountMinor
    {
        get; set;
    }
    [Required] public string Currency { get; set; } = "EUR";
    [Required] public string Result { get; set; } = "succeeded";
    [Required] public string Reason { get; set; } = "";
}
public class ReconciliationDto : ReconciliationInput
{
    public Guid Id
    {
        get; set;
    }
    public string MatchStatus { get; set; } = "";
    public DateTime CreatedAt
    {
        get; set;
    }
}
public class PaymentAttemptDto
{
    public Guid Id
    {
        get; set;
    }
    public Guid PaymentId
    {
        get; set;
    }
    public int Number
    {
        get; set;
    }
    public string Status { get; set; } = "";
    public string Reference { get; set; } = "";
    public string Reason { get; set; } = "";
    public DateTime CreatedAt
    {
        get; set;
    }
}
public partial interface IOperationsAppService
{
    Task<FileResultDto> ExportBatchAsync(Guid batchId);
    Task<List<PaymentDto>> SubmitBatchAsync(Guid batchId, ActionInput input);
    Task<List<PaymentAttemptDto>> GetPaymentAttemptsAsync(Guid paymentId);
    Task<List<ReconciliationDto>> GetReconciliationsAsync();
    Task<ReconciliationDto> RecordReconciliationAsync(ReconciliationInput input);
}
