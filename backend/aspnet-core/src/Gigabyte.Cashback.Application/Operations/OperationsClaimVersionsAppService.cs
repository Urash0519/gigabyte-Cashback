using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Auditing;
using Volo.Abp.Uow;

namespace Gigabyte.Cashback.Operations;

public partial class OperationsAppService
{
    public async Task<ClaimVersionCheckDto> GetClaimVersionCheckAsync(Guid id)
    {
        var claim = await claims.GetAsync(id);
        await Owner(claim);
        var campaign = await campaigns.GetAsync(claim.CampaignId);
        var current = await versions.GetAsync(claim.CampaignVersionId!.Value);
        var latest = (await versions.GetListAsync(x => x.CampaignId == campaign.Id && x.Version == campaign.PublishedVersion)).Single();
        return new()
        {
            CurrentVersionId = current.Id,
            CurrentVersion = current.Version,
            LatestVersionId = latest.Id,
            LatestVersion = latest.Version,
            NeedsUpdate = claim.ReviewStatus == "Draft" && current.Id != latest.Id,
            Campaign = await CampaignDto(campaign, false)
        };
    }

    [DisableAuditing]
    [UnitOfWork(isTransactional: true)]
    public async Task<ClaimDto> ApplyClaimVersionAsync(Guid id, ApplyClaimVersionInput input)
    {
        var claim = await claims.GetAsync(id);
        await Owner(claim);
        Require(claim.ReviewStatus == "Draft", "Only an unsubmitted draft can apply a newer campaign version.");
        var campaign = await campaigns.GetAsync(claim.CampaignId);
        var latest = (await versions.GetListAsync(x => x.CampaignId == campaign.Id && x.Version == campaign.PublishedVersion)).Single();
        Require(input.ExpectedLatestVersionId == latest.Id, "Campaign changed again. Review the latest version before applying it.");
        if (claim.CampaignVersionId == latest.Id)
            return await ClaimDto(claim);
        var current = await versions.GetAsync(claim.CampaignVersionId!.Value);
        var rules = Decode<CampaignInput>(latest.SnapshotJson);
        var data = Decode<ClaimInput>(claim.DataJson);
        data.TermsAccepted = false;
        data.PrivacyAccepted = false;
        foreach (var item in data.Items)
            item.AmountMinor = rules.Products.FirstOrDefault(x => x.Id == item.ProductId)?.CashbackMinor ?? 0;
        // Retain all entered fields and uploaded references, including products removed by newer rules.
        // Submission will identify ineligible products; never silently discard the user's work or bank ciphertext.
        claim.DataJson = Encode(data);
        claim.CampaignVersionId = latest.Id;
        claim.Currency = rules.Currency;
        claim.AmountMinor = 0; // An unsubmitted draft has no approved/reserved reward amount.
        // Repository Update marks the aggregate modified; ABP rotates and checks its concurrency stamp.
        // Do not manually replace that stamp, which ABP also uses as the expected original value.
        await campaigns.UpdateAsync(campaign);
        await claims.UpdateAsync(claim);
        await Log(id, "DraftCampaignVersionApplied", $"Campaign version {current.Version} ({current.Id}) -> {latest.Version} ({latest.Id}); terms and privacy consent reset");
        return await ClaimDto(claim);
    }
}
