using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Gigabyte.Cashback.Operations;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.Auditing;

namespace Gigabyte.Cashback.Controllers;

public partial class OperationsController
{
    [DisableAuditing, HttpGet("payments/batches/{batchId:guid}/export")]
    public async Task<IActionResult> ExportBatch(Guid batchId)
    {
        var file = await service.ExportBatchAsync(batchId);
        return File(file.Content, file.ContentType, file.FileName);
    }
    [HttpPost("payments/batches/{batchId:guid}/submit")]
    public Task<List<PaymentDto>> SubmitBatch(Guid batchId, ActionInput input) => service.SubmitBatchAsync(batchId, input);
    [HttpGet("payments/{paymentId:guid}/attempts")]
    public Task<List<PaymentAttemptDto>> Attempts(Guid paymentId) => service.GetPaymentAttemptsAsync(paymentId);
    [HttpGet("reconciliations")]
    public Task<List<ReconciliationDto>> Reconciliations() => service.GetReconciliationsAsync();
    [HttpPost("reconciliations")]
    public Task<ReconciliationDto> Reconcile(ReconciliationInput input) => service.RecordReconciliationAsync(input);
}
