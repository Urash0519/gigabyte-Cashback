using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Gigabyte.Cashback.Permissions;
using Volo.Abp.Auditing;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Uow;

namespace Gigabyte.Cashback.Operations;

public partial class OperationsAppService
{
    private IRepository<PaymentAttempt, Guid> Attempts => LazyServiceProvider.LazyGetRequiredService<IRepository<PaymentAttempt, Guid>>();
    private IRepository<ReconciliationEntry, Guid> Reconciliations => LazyServiceProvider.LazyGetRequiredService<IRepository<ReconciliationEntry, Guid>>();
    private async Task UpdateAttemptAsync(PaymentRecord payment, ActionInput input, string next)
    {
        var previous = (await Attempts.GetListAsync(x => x.PaymentId == payment.Id)).OrderByDescending(x => x.Number).FirstOrDefault();
        if (input.Action == "retry" || previous == null)
        {
            previous = new PaymentAttempt(GuidGenerator.Create(), payment.Id, (previous?.Number ?? 0) + 1, input.Reason);
            await Attempts.InsertAsync(previous);
        }
        previous.Status = next;
        previous.Reference = input.Reference;
        await Attempts.UpdateAsync(previous);
        if (input.Action is "succeeded" or "failed")
            await Reconciliations.InsertAsync(new ReconciliationEntry(GuidGenerator.Create(), payment.Id, payment.Id.ToString(), input.Reference, payment.AmountMinor, payment.Currency, input.Action, "Matched", input.Reason));
    }
    public async Task<List<PaymentAttemptDto>> GetPaymentAttemptsAsync(Guid paymentId)
    {
        await Permit(CashbackPermissions.Payments.Reconcile);
        return (await Attempts.GetListAsync(x => x.PaymentId == paymentId)).OrderBy(x => x.Number).Select(x => new PaymentAttemptDto { Id = x.Id, PaymentId = x.PaymentId, Number = x.Number, Status = x.Status, Reference = x.Reference, Reason = x.Reason, CreatedAt = x.CreationTime }).ToList();
    }
    private static ReconciliationDto ReceiptDto(ReconciliationEntry x) => new() { Id = x.Id, PaymentId = x.ExternalPaymentId, Reference = x.Reference, AmountMinor = x.AmountMinor, Currency = x.Currency, Result = x.Result, MatchStatus = x.MatchStatus, Reason = x.Reason, CreatedAt = x.CreationTime };
    public async Task<List<ReconciliationDto>> GetReconciliationsAsync()
    {
        await Permit(CashbackPermissions.Payments.Reconcile);
        return (await Reconciliations.GetListAsync()).OrderByDescending(x => x.CreationTime).Select(ReceiptDto).ToList();
    }
    [UnitOfWork(isTransactional: true)]
    public async Task<ReconciliationDto> RecordReconciliationAsync(ReconciliationInput input)
    {
        await Permit(CashbackPermissions.Payments.Reconcile);
        Require(!string.IsNullOrWhiteSpace(input.Reference) && !string.IsNullOrWhiteSpace(input.Reason) && input.Result is "succeeded" or "failed", "Reference, reason and a succeeded / failed result are required.");
        var payment = Guid.TryParse(input.PaymentId, out var id) ? await payments.FindAsync(id) : null;
        var status = payment == null ? "Unmatched" : payment.AmountMinor != input.AmountMinor || payment.Currency != input.Currency ? "Mismatch" : payment.Status is not ("Submitted" or "Processing" or "Unknown") ? "DuplicateOrClosed" : "Matched";
        if (status == "Matched")
        {
            await PaymentActionAsync(payment!.Id, new ActionInput { Action = input.Result, Reason = input.Reason, Reference = input.Reference, AmountMinor = input.AmountMinor, Currency = input.Currency });
            await CurrentUnitOfWork!.SaveChangesAsync();
            return ReceiptDto((await Reconciliations.GetListAsync(x => x.PaymentId == payment.Id && x.Reference == input.Reference)).OrderByDescending(x => x.CreationTime).First());
        }
        var entry = new ReconciliationEntry(GuidGenerator.Create(), payment?.Id, input.PaymentId, input.Reference, input.AmountMinor, input.Currency, input.Result, status, input.Reason);
        await Reconciliations.InsertAsync(entry, autoSave: true);
        await Log(entry.Id, "Reconciliation:" + status, input.Reason, input.AmountMinor);
        return ReceiptDto(entry);
    }
    [DisableAuditing, UnitOfWork(isTransactional: true)]
    public async Task<FileResultDto> ExportBatchAsync(Guid batchId)
    {
        await Permit(CashbackPermissions.Payments.Authorize);
        await Permit(CashbackPermissions.Claims.ViewSensitive);
        var batch = (await payments.GetListAsync(x => x.BatchId == batchId)).OrderBy(x => x.Id).ToList();
        Require(batch.Count > 0, "Batch not found.");
        var csv = new StringBuilder();
        foreach (var p in batch)
        {
            var file = await ExportPaymentAsync(p.Id);
            var text = Encoding.UTF8.GetString(file.Content);
            var firstLine = text.IndexOf('\n') + 1;
            if (csv.Length == 0)
                csv.Append(text[..firstLine]);
            csv.Append(text[firstLine..]);
        }
        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        var hash = Convert.ToHexString(SHA256.HashData(bytes));
        var manifest = Encode(new
        {
            batchId,
            instructionVersion = 1,
            instructionIds = batch.Select(x => x.Id),
            instructionCount = batch.Count,
            totals = batch.GroupBy(x => x.Currency).Select(g => new { currency = g.Key, amountMinor = g.Sum(x => x.AmountMinor) }),
            csvSha256 = hash,
            createdAt = batch.Min(x => x.CreationTime)
        });
        using var output = new MemoryStream();
        using (var zip = new ZipArchive(output, ZipArchiveMode.Create, true))
        {
            foreach (var content in new[] { (Name: "payments.csv", Bytes: bytes), (Name: "manifest.json", Bytes: Encoding.UTF8.GetBytes(manifest)) })
            {
                var entry = zip.CreateEntry(content.Name, CompressionLevel.Optimal);
                entry.LastWriteTime = new DateTimeOffset(2000, 1, 1, 0, 0, 0, TimeSpan.Zero);
                using var stream = entry.Open();
                await stream.WriteAsync(content.Bytes);
            }
        }
        await Log(batchId, "SensitiveBatchExport", "CSV SHA256 " + hash + "; immutable instruction manifest included");
        return new FileResultDto { FileName = "payment-batch-" + batchId + ".zip", ContentType = "application/zip", Content = output.ToArray() };
    }
    [UnitOfWork(isTransactional: true)]
    public async Task<List<PaymentDto>> SubmitBatchAsync(Guid batchId, ActionInput input)
    {
        await Permit(CashbackPermissions.Payments.Reconcile);
        Require(!string.IsNullOrWhiteSpace(input.Reference) && !string.IsNullOrWhiteSpace(input.Reason), "Delivery reference and reason are required.");
        var batch = await payments.GetListAsync(x => x.BatchId == batchId);
        Require(batch.Count > 0, "Batch not found.");
        foreach (var p in batch)
        {
            Require(p.Status == "Authorized" && p.ExportSha256.Length > 0, "Export every instruction before delivering this batch.");
            Require(!(await claims.GetAsync(p.ClaimId)).OnHold, "A claim is on hold.");
        }
        var result = new List<PaymentDto>();
        foreach (var p in batch)
            result.Add(await PaymentActionAsync(p.Id, new ActionInput { Action = "submitted", Reason = input.Reason, Reference = input.Reference }));
        await Log(batchId, "BatchDelivered", input.Reference + ": " + input.Reason);
        return result;
    }
}
