using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Gigabyte.Cashback.Permissions;
using Volo.Abp.Auditing;

namespace Gigabyte.Cashback.Operations;

public partial class OperationsAppService
{
    private sealed record ReportItem(ClaimRecord Claim, ClaimInput Data, CampaignInput Rules, ClaimItemInput Item);
    public async Task<ReportDto> GetReportsAsync(Guid? campaignId = null, string? market = null, DateTime? from = null, DateTime? to = null)
    {
        await Permit(CashbackPermissions.Reports.Default);
        Require(!from.HasValue || !to.HasValue || from < to, "Report end must be after its start.");
        var snapshots = (await versions.GetListAsync()).ToDictionary(x => x.Id, x => Decode<CampaignInput>(x.SnapshotJson));
        var all = (await claims.GetListAsync()).Where(c => c.SubmittedAt.HasValue && (!campaignId.HasValue || c.CampaignId == campaignId) && (!from.HasValue || c.SubmittedAt >= from) && (!to.HasValue || c.SubmittedAt < to))
            .Select(c => (Claim: c, Data: Decode<ClaimInput>(c.DataJson))).Where(x => market == null || x.Data.Market == market)
            .SelectMany(x => x.Data.Items.Select(i => new ReportItem(x.Claim, x.Data, snapshots[x.Claim.CampaignVersionId!.Value], i))).ToList();
        var report = new ReportDto { GeneratedAt = Clock.Now };
        var history = (await events.GetListAsync()).ToLookup(x => x.TargetId);
        foreach (var dimension in new[] { "campaign", "market", "purchaseCountry", "residenceCountry", "bankCountry", "language", "reviewStatus", "paymentStatus", "retailer", "product", "category", "month", "week", "riskHold" })
        {
            var groups = all.GroupBy(x => new
            {
                Value = dimension switch
                {
                    "campaign" => x.Claim.CampaignId.ToString(), "market" => x.Data.Market,
                    "purchaseCountry" => x.Data.PurchaseCountry, "residenceCountry" => x.Data.ResidenceCountry,
                    "bankCountry" => x.Data.BankCountry, "language" => x.Data.Language,
                    "reviewStatus" => x.Claim.ReviewStatus, "paymentStatus" => x.Claim.PaymentStatus,
                    "retailer" => string.IsNullOrWhiteSpace(x.Item.RetailerId) ? x.Data.RetailerId : x.Item.RetailerId,
                    "product" => x.Item.ProductId, "category" => x.Rules.Products.FirstOrDefault(p => p.Id == x.Item.ProductId)?.Category ?? "Unknown",
                    "month" => x.Claim.SubmittedAt!.Value.ToString("yyyy-MM"),
                    "week" => System.Globalization.ISOWeek.GetYear(x.Claim.SubmittedAt!.Value) + "-W" + System.Globalization.ISOWeek.GetWeekOfYear(x.Claim.SubmittedAt.Value).ToString("00"),
                    _ => x.Claim.OnHold ? "On hold" : "Clear"
                }, x.Claim.Currency
            });
            foreach (var g in groups)
            {
                var unique = g.DistinctBy(x => x.Claim.Id).ToList();
                var approved = unique.Count(x => x.Claim.ReviewStatus == "Approved");
                var rejected = unique.Count(x => x.Claim.ReviewStatus == "Rejected");
                var reviewDays = unique.Where(x => x.Claim.ReviewStatus is "Approved" or "Rejected").Select(x => DurationDays(x.Claim.SubmittedAt, history[x.Claim.Id].Where(e => e.Action is "approve" or "reject").OrderByDescending(e => e.CreationTime).FirstOrDefault()?.CreationTime)).Where(x => x.HasValue).Select(x => x!.Value).ToList();
                var paymentDays = unique.Where(x => x.Claim.PaymentStatus == "Succeeded").Select(x => DurationDays(history[x.Claim.Id].Where(e => e.Action == "PaymentAuthorized").OrderBy(e => e.CreationTime).FirstOrDefault()?.CreationTime, history[x.Claim.Id].Where(e => e.Action == "Payment:Succeeded").OrderByDescending(e => e.CreationTime).FirstOrDefault()?.CreationTime)).Where(x => x.HasValue).Select(x => x!.Value).ToList();
                report.Rows.Add(new ReportRowDto
                {
                    Dimension = dimension, Value = g.Key.Value, Currency = g.Key.Currency,
                    AverageReviewDays = Mean(reviewDays), MedianReviewDays = Median(reviewDays),
                    AveragePaymentDays = Mean(paymentDays), MedianPaymentDays = Median(paymentDays),
                    SupplementRate = unique.Count == 0 ? null : (decimal)unique.Count(x => history[x.Claim.Id].Any(e => e.Action == "supplement")) / unique.Count,
                    FirstReviewOverdue = unique.Count(x => (x.Claim.ReviewStatus is "Submitted" or "UnderReview") && !history[x.Claim.Id].Any(e => e.Action.StartsWith("Check:", StringComparison.Ordinal) || e.Action is "approve" or "reject" or "supplement") && x.Claim.SubmittedAt < report.GeneratedAt.AddDays(-ReviewSlaDays(x.Rules))),
                    Claims = unique.Count, Items = g.Count(), AmountMinor = g.Sum(x => x.Item.AmountMinor),
                    Approved = approved, Rejected = rejected, ApprovalRate = approved + rejected == 0 ? null : (decimal)approved / (approved + rejected),
                    Paid = unique.Count(x => x.Claim.PaymentStatus == "Succeeded"), OnHold = unique.Count(x => x.Claim.OnHold),
                    SlaOverdue = unique.Count(x => (x.Claim.ReviewStatus is "Submitted" or "UnderReview" or "MoreInfoRequired") && x.Claim.SubmittedAt < report.GeneratedAt.AddDays(-ReviewSlaDays(x.Rules)))
                });
            }
        }
        return report;
    }
    private static int ReviewSlaDays(CampaignInput rules) => rules.LegacyFields.TryGetValue("reviewSlaDays", out var days) && int.TryParse(days, out var sla) && sla > 0 ? sla : 7;
    private static decimal? DurationDays(DateTime? start, DateTime? end) => start.HasValue && end.HasValue && end.Value >= start.Value ? (decimal)(end.Value - start.Value).TotalDays : null;
    private static decimal? Mean(List<decimal> values) => values.Count == 0 ? null : values.Average();
    private static decimal? Median(List<decimal> values)
    {
        if (values.Count == 0) return null;
        var sorted = values.OrderBy(x => x).ToArray();
        var middle = sorted.Length / 2;
        return sorted.Length % 2 == 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
    }

    [DisableAuditing]
    public async Task<FileResultDto> ExportReportAsync(Guid? campaignId = null, string? market = null, DateTime? from = null, DateTime? to = null, string? dimension = null)
    {
        await Permit(CashbackPermissions.Reports.Export);
        var report = await GetReportsAsync(campaignId, market, from, to);
        var rows = report.Rows.Where(row => string.IsNullOrWhiteSpace(dimension) || row.Dimension == dimension).ToList();
        static string Csv(object? value)
        {
            var text = value is IFormattable formattable ? formattable.ToString(null, CultureInfo.InvariantCulture) : value?.ToString() ?? "";
            if (text.TrimStart().Length > 0 && "=+-@".Contains(text.TrimStart()[0])) text = "'" + text;
            return "\"" + text.Replace("\"", "\"\"") + "\"";
        }
        var csv = new StringBuilder("GeneratedAt,DateBasis,TimeZone,CampaignFilter,MarketFilter,FromInclusive,ToExclusive,Dimension,Value,Currency,Claims,Items,AmountMinor,Approved,Rejected,ApprovalRatePercent,PaidClaims,OnHold,SlaOverdue,FirstReviewOverdue,SupplementRatePercent,AverageReviewDays,MedianReviewDays,AveragePaymentDays,MedianPaymentDays\r\n");
        foreach (var row in rows)
            csv.AppendLine(string.Join(",", new object?[] { report.GeneratedAt.ToString("O"), report.DateBasis, report.TimeZone, campaignId, market, from?.ToString("O"), to?.ToString("O"), row.Dimension, row.Value, row.Currency, row.Claims, row.Items, row.AmountMinor, row.Approved, row.Rejected, row.ApprovalRate * 100, row.Paid, row.OnHold, row.SlaOverdue, row.FirstReviewOverdue, row.SupplementRate * 100, row.AverageReviewDays, row.MedianReviewDays, row.AveragePaymentDays, row.MedianPaymentDays }.Select(Csv)));
        await Log(campaignId ?? Guid.Empty, "ReportExported", $"Scope: campaign={campaignId}; market={market}; from={from:O}; toExclusive={to:O}; dimension={dimension}; rows={rows.Count}; generated={report.GeneratedAt:O}; dateBasis={report.DateBasis}; timeZone={report.TimeZone}");
        return new FileResultDto { FileName = "cashback-report.csv", ContentType = "text/csv; charset=utf-8", Content = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray() };
    }
}
