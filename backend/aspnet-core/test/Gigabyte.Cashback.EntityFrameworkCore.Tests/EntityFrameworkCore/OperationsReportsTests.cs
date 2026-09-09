using System;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Gigabyte.Cashback.Operations;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Gigabyte.Cashback.EntityFrameworkCore;

[Collection(CashbackTestConsts.CollectionDefinitionName)]
public class OperationsReportsTests : CashbackEntityFrameworkCoreTestBase
{
    [Fact]
    public async Task Reports_should_deduplicate_cases_measure_cycles_and_audit_filtered_csv()
    {
        var campaignId = Guid.NewGuid();
        var versionId = Guid.NewGuid();
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var pending = Guid.NewGuid();
        var start = DateTime.UtcNow.Date.AddDays(-30);
        var service = GetRequiredService<IOperationsAppService>();
        await WithUnitOfWorkAsync(async () =>
        {
            var rules = new CampaignInput { Products = [new() { Id = "gpu", Category = "GPU" }, new() { Id = "board", Category = "Board" }] };
            await GetRequiredService<IRepository<Campaign, Guid>>().InsertAsync(new Campaign(campaignId) { Name = "Report fixture" }, true);
            await GetRequiredService<IRepository<CampaignVersion, Guid>>().InsertAsync(new CampaignVersion(versionId, campaignId, 1, JsonSerializer.Serialize(rules)), true);
            foreach (var (id, status, payment, country) in new[] { (first, "Approved", "Succeeded", "FR"), (second, "Rejected", "None", "DE"), (pending, "Submitted", "None", "FR") })
            {
                var input = new ClaimInput { CampaignId = campaignId, Market = "DE", PurchaseCountry = country, Items = [new() { ProductId = "gpu", AmountMinor = 1000 }, new() { ProductId = "board", AmountMinor = 2000 }] };
                await GetRequiredService<IRepository<ClaimRecord, Guid>>().InsertAsync(new ClaimRecord(id) { CampaignId = campaignId, CampaignVersionId = versionId, Reference = id.ToString(), DataJson = JsonSerializer.Serialize(input), SubmittedAt = start, ReviewStatus = status, PaymentStatus = payment, AmountMinor = 3000 }, true);
            }
            foreach (var (target, action, days) in new[] { (first, "supplement", 1), (first, "approve", 2), (second, "reject", 4), (first, "PaymentAuthorized", 3), (first, "Payment:Succeeded", 9) })
            {
                var item = new OperationEvent(Guid.NewGuid(), target, action, "Report fixture", "test@example.test", 0, "reports-test");
                typeof(OperationEvent).GetProperty(nameof(OperationEvent.CreationTime))!.SetValue(item, start.AddDays(days));
                await GetRequiredService<IRepository<OperationEvent, Guid>>().InsertAsync(item, true);
            }
        });
        await WithUnitOfWorkAsync(async () =>
        {
            var report = await service.GetReportsAsync(campaignId, "DE", start, start.AddDays(1));
            var total = report.Rows.Single(row => row.Dimension == "campaign");
            total.Claims.ShouldBe(3); total.Items.ShouldBe(6); total.AmountMinor.ShouldBe(9000);
            total.Approved.ShouldBe(1); total.Rejected.ShouldBe(1); total.ApprovalRate.ShouldBe(0.5m);
            total.AverageReviewDays.ShouldBe(3m); total.MedianReviewDays.ShouldBe(3m);
            total.AveragePaymentDays.ShouldBe(6m); total.MedianPaymentDays.ShouldBe(6m);
            total.SupplementRate.ShouldBe(1m / 3); total.FirstReviewOverdue.ShouldBe(1);
            var gpu = report.Rows.Single(row => row.Dimension == "product" && row.Value == "gpu");
            gpu.Claims.ShouldBe(3); gpu.Items.ShouldBe(3); gpu.AmountMinor.ShouldBe(3000); gpu.AverageReviewDays.ShouldBe(3m);
            var noDecisions = report.Rows.Single(row => row.Dimension == "reviewStatus" && row.Value == "Submitted");
            noDecisions.ApprovalRate.ShouldBeNull(); noDecisions.AverageReviewDays.ShouldBeNull(); noDecisions.AveragePaymentDays.ShouldBeNull();
            (await service.GetReportsAsync(campaignId, "DE", start.AddDays(-1), start)).Rows.ShouldBeEmpty();
            var export = await service.ExportReportAsync(campaignId, "DE", start, start.AddDays(1), "product");
            var csv = Encoding.UTF8.GetString(export.Content);
            csv.ShouldContain("AverageReviewDays"); csv.ShouldContain("\"gpu\""); csv.ShouldNotContain("test@example.test");
            csv.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length.ShouldBe(3);
        });
        await WithUnitOfWorkAsync(async () =>
        {
            var audit = await GetRequiredService<IRepository<OperationEvent, Guid>>().GetListAsync(x => x.TargetId == campaignId && x.Action == "ReportExported");
            audit.Count.ShouldBe(1); audit.Single().Reason.ShouldContain("rows=2"); audit.Single().Reason.ShouldContain("dimension=product");
        });
    }
}
