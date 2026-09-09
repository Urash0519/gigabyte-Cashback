using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Gigabyte.Cashback.Operations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc;
using Volo.Abp.Auditing;

namespace Gigabyte.Cashback.Controllers;

[ApiController]
[Route("api/operations")]
[Authorize]
public partial class OperationsController(IOperationsAppService service) : AbpControllerBase
{
    [AllowAnonymous, HttpGet("campaigns")] public Task<List<CampaignDto>> Campaigns(bool admin = false) => service.GetCampaignsAsync(admin);
    [HttpPost("campaigns")] public Task<CampaignDto> Create(CampaignInput input) => service.CreateCampaignAsync(input);
    [HttpPost("campaigns/{id:guid}/save")] public Task<CampaignDto> Save(Guid id, CampaignInput input) => service.SaveCampaignAsync(id, input);
    [HttpPost("campaigns/{id:guid}/copy")] public Task<CampaignDto> Copy(Guid id) => service.CopyCampaignAsync(id);
    [HttpPost("campaigns/{id:guid}/publish")] public Task<CampaignDto> Publish(Guid id, ReasonInput input) => service.PublishCampaignAsync(id, input);
    [HttpGet("claims")] public Task<List<ClaimDto>> Claims(bool admin = false) => service.GetClaimsAsync(admin);
    [DisableAuditing, HttpPost("claims")] public Task<ClaimDto> CreateClaim(ClaimInput input) => service.CreateClaimAsync(input);
    [DisableAuditing, HttpPost("claims/{id:guid}/save")] public Task<ClaimDto> SaveClaim(Guid id, ClaimInput input) => service.SaveClaimAsync(id, input);
    [HttpPost("claims/{id:guid}/submit")] public Task<ClaimDto> Submit(Guid id) => service.SubmitClaimAsync(id);
    [HttpPost("claims/{id:guid}/action")] public Task<ClaimDto> ClaimAction(Guid id, ActionInput input) => service.ClaimActionAsync(id, input);
    [DisableAuditing, HttpPost("claims/{id:guid}/evidence"), RequestSizeLimit(12 * 1024 * 1024)] public Task<EvidenceDto> Evidence(Guid id, EvidenceUploadInput input) => service.UploadEvidenceAsync(id, input);
    [HttpGet("claims/{id:guid}/evidence/{fileId:guid}")]
    public async Task<IActionResult> Download(Guid id, Guid fileId)
    {
        var f = await service.GetEvidenceAsync(id, fileId);
        return File(f.Content, f.ContentType, f.FileName);
    }
    [HttpGet("payments")] public Task<List<PaymentDto>> Payments() => service.GetPaymentsAsync();
    [HttpPost("payments")] public Task<List<PaymentDto>> CreatePayments(PaymentInput input) => service.CreatePaymentsAsync(input);
    [HttpPost("payments/{id:guid}/action")] public Task<PaymentDto> PaymentAction(Guid id, ActionInput input) => service.PaymentActionAsync(id, input);
    [DisableAuditing, HttpGet("payments/{id:guid}/export")]
    public async Task<IActionResult> Export(Guid id)
    {
        var f = await service.ExportPaymentAsync(id);
        return File(f.Content, f.ContentType, f.FileName);
    }
    [HttpGet("reports")] public Task<ReportDto> Reports(Guid? campaignId = null, string? market = null, DateTime? from = null, DateTime? to = null) => service.GetReportsAsync(campaignId, market, from, to);
    [DisableAuditing, HttpGet("reports/export")]
    public async Task<IActionResult> ExportReport(Guid? campaignId = null, string? market = null, DateTime? from = null, DateTime? to = null, string? dimension = null)
    {
        var f = await service.ExportReportAsync(campaignId, market, from, to, dimension);
        return File(f.Content, f.ContentType, f.FileName);
    }
    [HttpGet("audit")] public Task<List<EventDto>> Audit() => service.GetAuditAsync();
    [DisableAuditing, HttpPost("claims/{id:guid}/bank")] public Task<ClaimDto> Bank(Guid id, BankChangeInput input) => service.ChangeBankAsync(id, input);
    [HttpGet("notifications")] public Task<List<NotificationDto>> Notifications() => service.GetNotificationsAsync();
    [HttpPost("notifications/{id:guid}/simulate")] public Task SimulateNotification(Guid id) => service.SimulateNotificationAsync(id);
}
