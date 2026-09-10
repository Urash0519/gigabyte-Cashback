using System;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Gigabyte.Cashback.Operations;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Security.Claims;
using Xunit;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Uow;
using System.IO;
using System.IO.Compression;
using System.Text.Json;
using System.Security.Cryptography;
using Gigabyte.Cashback.Notifications;

namespace Gigabyte.Cashback.EntityFrameworkCore;

[Collection(CashbackTestConsts.CollectionDefinitionName)]
public class OperationsAppServiceTests : CashbackEntityFrameworkCoreTestBase
{
    private IOperationsAppService _service = null!;
    // Match HTTP requests: each operation gets its own DI scope and completed unit of work.
    protected override async Task<T> WithUnitOfWorkAsync<T>(Func<Task<T>> action)
    {
        using var scope = ServiceProvider.CreateScope();
        _service = scope.ServiceProvider.GetRequiredService<IOperationsAppService>();
        using var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWorkManager>().Begin(requiresNew: true, isTransactional: true);
        var result = await action();
        await uow.CompleteAsync();
        return result;
    }
    protected override async Task WithUnitOfWorkAsync(Func<Task> action)
    {
        await WithUnitOfWorkAsync(async () => { await action(); return true; });
    }

    private async Task<CampaignDto> PublishedCampaignAsync(long budget = 10000, string exclusivityGroup = "")
    {
        var today = DateTime.UtcNow.Date;
        var created = await WithUnitOfWorkAsync(() => _service.CreateCampaignAsync(new CampaignInput
        {
            Name = "Integration " + Guid.NewGuid(), BudgetMinor = budget, ExclusivityGroup = exclusivityGroup,
            PurchaseStart = today.AddDays(-30), PurchaseEnd = today.AddDays(1),
            ClaimStart = today.AddDays(-30), ClaimEnd = today.AddDays(30),
            Terms = "Terms", Privacy = "Privacy", MaxClaimsPerPerson = 10,
            Products = [new() { Id = "gpu", Category = "GPU", Model = "RTX", CashbackMinor = 1000 }, new() { Id = "board", Category = "Motherboard", Model = "B860", CashbackMinor = 2000 }],
            Retailers = [new() { Id = "shop", Name = "Shop", Country = "DE" }]
        }));
        return await WithUnitOfWorkAsync(() => _service.PublishCampaignAsync(created.Id, new() { Reason = "Ready" }));
    }

    private async Task<ClaimDto> DraftWithEvidenceAsync(Guid campaign)
    {
        var draft = await WithUnitOfWorkAsync(() => _service.CreateClaimAsync(new ClaimInput
        {
            CampaignId = campaign, Market = "DE", FirstName = "Yoyo", LastName = "Chen", Address1 = "Test street 1",
            City = "Berlin", Postcode = "10115", PurchaseDate = DateTime.UtcNow.Date.AddDays(-1),
            PurchaseAmountMinor = 90000, InvoiceNumber = "INV-1", RetailerId = "shop",
            TermsAccepted = true, PrivacyAccepted = true,
            Bank = new() { AccountHolder = "Yoyo Chen", Iban = "DE89370400440532013000" },
            Items = [new() { ProductId = "gpu", SerialNumber = Guid.NewGuid().ToString("N"), AmountMinor = 999999 }]
        }));
        draft.Data.Bank.Iban.ShouldEndWith("3000");
        draft.Data.Bank.Iban.ShouldStartWith("*");
        await WithUnitOfWorkAsync(() => _service.UploadEvidenceAsync(draft.Id, new()
        {
            FileName = "invoice.pdf", Kind = "Invoice", Content = Encoding.ASCII.GetBytes("%PDF-1.4 test invoice")
        }));
        await WithUnitOfWorkAsync(() => _service.UploadEvidenceAsync(draft.Id, new()
        {
            FileName = "serial.jpg", Kind = "SerialNumber", ProductId = "gpu", Content = [255, 216, 255, 1, 2]
        }));
        return draft;
    }

    [Fact]
    public async Task Public_discovery_should_hide_test_fixtures_using_published_provenance_only()
    {
        var normal = await PublishedCampaignAsync();
        var fixture = await PublishedCampaignAsync();
        fixture.Data.LegacyFields["dataPurpose"] = "integration-test";
        fixture.Data.ConcurrencyStamp = fixture.ConcurrencyStamp;
        await WithUnitOfWorkAsync(() => _service.SaveCampaignAsync(fixture.Id, fixture.Data));
        // A draft-only marker must not change public discovery before publication.
        (await WithUnitOfWorkAsync(() => _service.GetCampaignsAsync())).ShouldContain(x => x.Id == fixture.Id);
        await WithUnitOfWorkAsync(() => _service.PublishCampaignAsync(fixture.Id, new() { Reason = "Mark synthetic fixture" }));

        var legacy = await PublishedCampaignAsync();
        legacy.Data.Slug = "smoke-123";
        legacy.Data.Description = "Automated integration test";
        legacy.Data.Terms = "Synthetic test terms";
        legacy.Data.ConcurrencyStamp = legacy.ConcurrencyStamp;
        await WithUnitOfWorkAsync(() => _service.SaveCampaignAsync(legacy.Id, legacy.Data));
        await WithUnitOfWorkAsync(() => _service.PublishCampaignAsync(legacy.Id, new() { Reason = "Historical fixture" }));

        var visible = await WithUnitOfWorkAsync(() => _service.GetCampaignsAsync());
        visible.ShouldContain(x => x.Id == normal.Id);
        visible.ShouldNotContain(x => x.Id == fixture.Id || x.Id == legacy.Id);
        var managed = await WithUnitOfWorkAsync(() => _service.GetCampaignsAsync(true));
        managed.ShouldContain(x => x.Id == fixture.Id);
        managed.ShouldContain(x => x.Id == legacy.Id);
    }

    private async Task ApproveAsync(Guid id)
    {
        foreach (var check in new[] { "membership", "invoice", "serial", "eligibility", "duplicates", "rma", "evidence" })
            await WithUnitOfWorkAsync(() => _service.ClaimActionAsync(id, new() { Action = "check", Value = check, Reason = "Verified" }));
        var approved = await WithUnitOfWorkAsync(() => _service.ClaimActionAsync(id, new() { Action = "approve", Reason = "All checks passed" }));
        approved.ReviewStatus.ShouldBe("Approved");
    }

    [Fact]
    public async Task Claim_to_reconciled_payment_should_commit_history_and_ledger_once()
    {
        var campaign = await PublishedCampaignAsync();
        campaign.PublishedVersion.ShouldBe(1);
        campaign.Versions.Single().Version.ShouldBe(1);
        var draft = await DraftWithEvidenceAsync(campaign.Id);
        var submitted = await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(draft.Id));
        submitted.ReviewStatus.ShouldBe("Submitted");
        submitted.AmountMinor.ShouldBe(1000);
        submitted.History.ShouldContain(x => x.Action == "Submitted");
        await ApproveAsync(draft.Id);
        var payment = (await WithUnitOfWorkAsync(() => _service.CreatePaymentsAsync(new() { ClaimIds = [draft.Id], Reason = "Authorized" }))).Single();
        await WithUnitOfWorkAsync(() => _service.PaymentActionAsync(payment.Id, new() { Action = "submitted", Reason = "Sent manually" }));
        await WithUnitOfWorkAsync(() => _service.PaymentActionAsync(payment.Id, new() { Action = "unknown", Reason = "No final result" }));
        await Should.ThrowAsync<UserFriendlyException>(() => WithUnitOfWorkAsync(() => _service.PaymentActionAsync(payment.Id, new() { Action = "retry", Reason = "Retry" })));
        await Should.ThrowAsync<UserFriendlyException>(() => WithUnitOfWorkAsync(() => _service.PaymentActionAsync(payment.Id, new() { Action = "succeeded", Reason = "Mismatch", Reference = "bank-1", AmountMinor = 999, Currency = "EUR" })));
        var result = new ActionInput { Action = "succeeded", Reason = "Statement matched", Reference = "bank-1", AmountMinor = 1000, Currency = "EUR" };
        (await WithUnitOfWorkAsync(() => _service.PaymentActionAsync(payment.Id, result))).Status.ShouldBe("Succeeded");
        await Should.ThrowAsync<UserFriendlyException>(() => WithUnitOfWorkAsync(() => _service.PaymentActionAsync(payment.Id, result)));
        await WithUnitOfWorkAsync(async () =>
        {
            var saved = (await _service.GetCampaignsAsync(true)).Single(x => x.Id == campaign.Id);
            saved.ReservedMinor.ShouldBe(0); saved.ApprovedMinor.ShouldBe(0); saved.PaidMinor.ShouldBe(1000); saved.AvailableMinor.ShouldBe(9000);
            var claim = (await _service.GetClaimsAsync()).Single(x => x.Id == draft.Id);
            claim.PaymentStatus.ShouldBe("Succeeded");
            claim.History.Count(x => x.Action == "Payment:Succeeded").ShouldBe(1);
            claim.History.Count(x => x.Action.StartsWith("Check:")).ShouldBe(7);
        });
    }

    [Fact]
    public async Task Approval_without_all_checks_should_preserve_reservation()
    {
        var campaign = await PublishedCampaignAsync();
        var draft = await DraftWithEvidenceAsync(campaign.Id);
        await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(draft.Id));
        await Should.ThrowAsync<UserFriendlyException>(() => WithUnitOfWorkAsync(() => _service.ClaimActionAsync(draft.Id, new() { Action = "approve", Reason = "Incomplete" })));
        await WithUnitOfWorkAsync(async () =>
        {
            var saved = (await _service.GetCampaignsAsync(true)).Single(x => x.Id == campaign.Id);
            saved.ReservedMinor.ShouldBe(1000); saved.ApprovedMinor.ShouldBe(0);
        });
    }

    [Fact]
    public async Task Budget_rejection_should_not_persist_submission_or_serial_reservation()
    {
        var campaign = await PublishedCampaignAsync(500);
        var draft = await DraftWithEvidenceAsync(campaign.Id);
        await Should.ThrowAsync<BusinessException>(() => WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(draft.Id)));
        await WithUnitOfWorkAsync(async () =>
        {
            var saved = (await _service.GetClaimsAsync()).Single(x => x.Id == draft.Id);
            saved.ReviewStatus.ShouldBe("Draft"); saved.AmountMinor.ShouldBe(0);
            (await GetRequiredService<IRepository<SerialReservation, Guid>>().CountAsync(x => x.ClaimId == draft.Id)).ShouldBe(0);
            (await _service.GetCampaignsAsync(true)).Single(x => x.Id == campaign.Id).ReservedMinor.ShouldBe(0);
        });
    }

    [Fact]
    public async Task Supplement_should_revise_product_and_serial_and_adjust_reserved_budget()
    {
        var campaign = await PublishedCampaignAsync();
        var draft = await DraftWithEvidenceAsync(campaign.Id);
        var originalSerial = draft.Data.Items.Single().SerialNumber;
        await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(draft.Id));
        var supplement = await WithUnitOfWorkAsync(() => _service.ClaimActionAsync(draft.Id, new() { Action = "supplement", Reason = "Correct product and serial" }));
        supplement.ReviewStatus.ShouldBe("MoreInfoRequired");
        var replacementSerial = Guid.NewGuid().ToString("N");
        supplement.Data.Items = [new() { ProductId = "board", SerialNumber = replacementSerial }];
        supplement.Data.ChangeReason = "Corrected product and serial against invoice";
        await WithUnitOfWorkAsync(() => _service.SaveClaimAsync(draft.Id, supplement.Data));
        await WithUnitOfWorkAsync(() => _service.UploadEvidenceAsync(draft.Id, new()
        {
            FileName = "board-serial.jpg", Kind = "SerialNumber", ProductId = "board", Content = [255, 216, 255, 1, 2]
        }));
        var resubmitted = await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(draft.Id));
        resubmitted.ReviewStatus.ShouldBe("Submitted");
        resubmitted.AmountMinor.ShouldBe(2000);
        await WithUnitOfWorkAsync(async () =>
        {
            var serials = await GetRequiredService<IRepository<SerialReservation, Guid>>().GetListAsync(x => x.ClaimId == draft.Id);
            serials.ShouldNotContain(x => x.SerialNumber == originalSerial.ToUpperInvariant());
            serials.ShouldContain(x => x.SerialNumber == replacementSerial.ToUpperInvariant());
            var saved = (await _service.GetCampaignsAsync(true)).Single(x => x.Id == campaign.Id);
            saved.ReservedMinor.ShouldBe(2000); saved.AvailableMinor.ShouldBe(8000);
            var revisions = await GetRequiredService<IRepository<ClaimRevision, Guid>>().GetListAsync(x => x.ClaimId == draft.Id);
            revisions.ShouldContain(x => x.AmountMinor == 1000 && x.DataJson.Contains(originalSerial));
        });
    }

    [Fact]
    public async Task Exclusive_campaign_application_should_block_duplicate_until_cancellation_releases_scopes()
    {
        var group = Guid.NewGuid().ToString("N");
        var firstCampaign = await PublishedCampaignAsync(exclusivityGroup: group);
        var secondCampaign = await PublishedCampaignAsync(exclusivityGroup: group);
        var first = await DraftWithEvidenceAsync(firstCampaign.Id);
        var second = await DraftWithEvidenceAsync(secondCampaign.Id);
        await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(first.Id));
        await Should.ThrowAsync<UserFriendlyException>(() => WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(second.Id)));
        await WithUnitOfWorkAsync(async () =>
        {
            (await GetRequiredService<IRepository<RuleReservation, Guid>>().CountAsync(x => x.ClaimId == first.Id)).ShouldBe(2);
        });
        await WithUnitOfWorkAsync(() => _service.ClaimActionAsync(first.Id, new() { Action = "cancel", Reason = "Switch campaign" }));
        (await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(second.Id))).ReviewStatus.ShouldBe("Submitted");
        await WithUnitOfWorkAsync(async () =>
        {
            (await GetRequiredService<IRepository<RuleReservation, Guid>>().CountAsync(x => x.ClaimId == first.Id)).ShouldBe(0);
            (await GetRequiredService<IRepository<RuleReservation, Guid>>().CountAsync(x => x.ClaimId == second.Id)).ShouldBe(2);
        });
    }

    [Fact]
    public async Task Batch_export_should_be_repeatable_with_totals_and_notification_linkage()
    {
        var campaign = await PublishedCampaignAsync();
        var claim = await DraftWithEvidenceAsync(campaign.Id);
        await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(claim.Id));
        await ApproveAsync(claim.Id);
        var payment = (await WithUnitOfWorkAsync(() => _service.CreatePaymentsAsync(new() { ClaimIds = [claim.Id], Reason = "Authorize" }))).Single();
        var first = await WithUnitOfWorkAsync(() => _service.ExportBatchAsync(payment.BatchId));
        var second = await WithUnitOfWorkAsync(() => _service.ExportBatchAsync(payment.BatchId));
        second.Content.ShouldBe(first.Content);
        using var zip = new ZipArchive(new MemoryStream(first.Content), ZipArchiveMode.Read);
        using var manifestStream = zip.GetEntry("manifest.json")!.Open();
        using var manifest = await JsonDocument.ParseAsync(manifestStream);
        manifest.RootElement.GetProperty("instructionCount").GetInt32().ShouldBe(1);
        manifest.RootElement.GetProperty("totals")[0].GetProperty("amountMinor").GetInt64().ShouldBe(1000);
        using var csvStream = zip.GetEntry("payments.csv")!.Open();
        using var csv = new MemoryStream();
        await csvStream.CopyToAsync(csv);
        manifest.RootElement.GetProperty("csvSha256").GetString().ShouldBe(Convert.ToHexString(SHA256.HashData(csv.ToArray())));
        await WithUnitOfWorkAsync(async () =>
        {
            var messages = await GetRequiredService<IRepository<NotificationOutboxMessage, Guid>>().GetListAsync(x => x.ClaimId == claim.Id);
            messages.ShouldNotBeEmpty();
            messages.ShouldAllBe(x => !string.IsNullOrWhiteSpace(x.TemplateVersion));
        });
    }

    [Fact]
    public async Task Reconciliation_should_preserve_unmatched_and_mismatch_and_create_retry_attempt()
    {
        var campaign = await PublishedCampaignAsync();
        var claim = await DraftWithEvidenceAsync(campaign.Id);
        await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(claim.Id));
        await ApproveAsync(claim.Id);
        var payment = (await WithUnitOfWorkAsync(() => _service.CreatePaymentsAsync(new() { ClaimIds = [claim.Id], Reason = "Authorize" }))).Single();
        await WithUnitOfWorkAsync(() => _service.ExportBatchAsync(payment.BatchId));
        await WithUnitOfWorkAsync(() => _service.SubmitBatchAsync(payment.BatchId, new() { Action = "submitted", Reason = "Manually delivered", Reference = "delivery-1" }));
        var unmatched = await WithUnitOfWorkAsync(() => _service.RecordReconciliationAsync(new() { PaymentId = "unknown-id", Reference = "receipt-unknown", Reason = "Statement", AmountMinor = 1000, Currency = "EUR", Result = "succeeded" }));
        unmatched.MatchStatus.ShouldBe("Unmatched");
        var mismatch = await WithUnitOfWorkAsync(() => _service.RecordReconciliationAsync(new() { PaymentId = payment.Id.ToString(), Reference = "receipt-mismatch", Reason = "Statement", AmountMinor = 999, Currency = "EUR", Result = "succeeded" }));
        mismatch.MatchStatus.ShouldBe("Mismatch");
        await WithUnitOfWorkAsync(() => _service.RecordReconciliationAsync(new() { PaymentId = payment.Id.ToString(), Reference = "receipt-failed", Reason = "Returned", AmountMinor = 1000, Currency = "EUR", Result = "failed" }));
        await WithUnitOfWorkAsync(() => _service.PaymentActionAsync(payment.Id, new() { Action = "retry", Reason = "Retry after confirmed failure" }));
        await WithUnitOfWorkAsync(async () =>
        {
            var attempts = await _service.GetPaymentAttemptsAsync(payment.Id);
            attempts.Count.ShouldBe(2);
            attempts.Single(x => x.Number == 1).Status.ShouldBe("Failed");
            attempts.Single(x => x.Number == 2).Status.ShouldBe("Authorized");
            var entries = await _service.GetReconciliationsAsync();
            entries.ShouldContain(x => x.Id == unmatched.Id && x.MatchStatus == "Unmatched");
            entries.ShouldContain(x => x.Id == mismatch.Id && x.MatchStatus == "Mismatch");
        });
    }

    [Fact]
    public async Task Public_list_should_only_return_current_owners_claims()
    {
        var campaign = await PublishedCampaignAsync();
        var draft = await DraftWithEvidenceAsync(campaign.Id);
        using (GetRequiredService<ICurrentPrincipalAccessor>().Change(new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(AbpClaimTypes.UserId, Guid.NewGuid().ToString()),
            new Claim(AbpClaimTypes.Email, "other@example.test")], "Test"))))
        {
            await WithUnitOfWorkAsync(async () => (await _service.GetClaimsAsync()).ShouldNotContain(x => x.Id == draft.Id));
        }
    }

    [Fact]
    public async Task Existing_claim_should_keep_its_campaign_snapshot_after_discovery_is_hidden()
    {
        var campaign = await PublishedCampaignAsync();
        var originalName = campaign.Data.Name;
        var draft = await DraftWithEvidenceAsync(campaign.Id);
        campaign = (await WithUnitOfWorkAsync(() => _service.GetCampaignsAsync(true))).Single(x => x.Id == campaign.Id);
        campaign.Data.Name = "Changed campaign name";
        campaign.Data.LegacyFields["dataPurpose"] = "integration-test";
        campaign.Data.ConcurrencyStamp = campaign.ConcurrencyStamp;
        await WithUnitOfWorkAsync(() => _service.SaveCampaignAsync(campaign.Id, campaign.Data));
        await WithUnitOfWorkAsync(() => _service.PublishCampaignAsync(campaign.Id, new() { Reason = "New hidden version" }));
        (await WithUnitOfWorkAsync(() => _service.GetCampaignsAsync())).ShouldNotContain(x => x.Id == campaign.Id);
        var associated = await WithUnitOfWorkAsync(() => _service.GetClaimCampaignAsync(draft.Id));
        associated.Id.ShouldBe(campaign.Id);
        associated.PublishedVersion.ShouldBe(1);
        associated.Data.Name.ShouldBe(originalName);
        associated.Versions.ShouldBeEmpty();
    }

    private async Task<CampaignDto> RepublishWaitingDaysAsync(Guid campaignId, int days)
    {
        var campaign = (await WithUnitOfWorkAsync(() => _service.GetCampaignsAsync(true))).Single(x => x.Id == campaignId);
        campaign.Data.ConcurrencyStamp = campaign.ConcurrencyStamp;
        campaign.Data.WaitingDays = days;
        await WithUnitOfWorkAsync(() => _service.SaveCampaignAsync(campaign.Id, campaign.Data));
        return await WithUnitOfWorkAsync(() => _service.PublishCampaignAsync(campaign.Id, new() { Reason = "Update waiting days" }));
    }

    [Fact]
    public async Task Draft_should_explicitly_apply_latest_rules_preserving_input_and_supplements_stay_pinned()
    {
        var campaign = await PublishedCampaignAsync();
        await RepublishWaitingDaysAsync(campaign.Id, 14);
        var draft = await DraftWithEvidenceAsync(campaign.Id);
        draft.Data.PurchaseDate = DateTime.UtcNow.Date.AddDays(-3);
        draft = await WithUnitOfWorkAsync(() => _service.SaveClaimAsync(draft.Id, draft.Data));
        var bankBefore = await WithUnitOfWorkAsync(async () => (await GetRequiredService<IRepository<ClaimRecord, Guid>>().GetAsync(draft.Id)).BankCiphertext);
        await RepublishWaitingDaysAsync(campaign.Id, 2);
        var check = await WithUnitOfWorkAsync(() => _service.GetClaimVersionCheckAsync(draft.Id));
        check.NeedsUpdate.ShouldBeTrue();
        check.Campaign.Data.WaitingDays.ShouldBe(2);
        (await Should.ThrowAsync<UserFriendlyException>(() => WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(draft.Id)))).Message.ShouldContain("newer published version");
        var applied = await WithUnitOfWorkAsync(() => _service.ApplyClaimVersionAsync(draft.Id, new() { ExpectedLatestVersionId = check.LatestVersionId }));
        (await WithUnitOfWorkAsync(() => _service.GetClaimVersionCheckAsync(draft.Id))).Campaign.ConcurrencyStamp.ShouldNotBe(check.Campaign.ConcurrencyStamp);
        applied.Data.PurchaseDate.ShouldBe(draft.Data.PurchaseDate);
        applied.Data.FirstName.ShouldBe(draft.Data.FirstName);
        applied.Data.Items.Single().SerialNumber.ShouldBe(draft.Data.Items.Single().SerialNumber);
        applied.Data.Attachments.Count.ShouldBe(2);
        applied.Data.TermsAccepted.ShouldBeFalse();
        applied.Data.PrivacyAccepted.ShouldBeFalse();
        applied.Data.Items.Single().AmountMinor.ShouldBe(1000);
        applied.AmountMinor.ShouldBe(0);
        applied.History.ShouldContain(x => x.Action == "DraftCampaignVersionApplied");
        (await WithUnitOfWorkAsync(async () => (await GetRequiredService<IRepository<ClaimRecord, Guid>>().GetAsync(draft.Id)).BankCiphertext)).ShouldBe(bankBefore);
        applied.Data.TermsAccepted = applied.Data.PrivacyAccepted = true;
        await WithUnitOfWorkAsync(() => _service.SaveClaimAsync(draft.Id, applied.Data));
        var submitted = await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(draft.Id));
        submitted.ReviewStatus.ShouldBe("Submitted");
        await Should.ThrowAsync<UserFriendlyException>(() => WithUnitOfWorkAsync(() => _service.ApplyClaimVersionAsync(draft.Id, new() { ExpectedLatestVersionId = check.LatestVersionId })));
        await RepublishWaitingDaysAsync(campaign.Id, 99);
        await WithUnitOfWorkAsync(() => _service.ClaimActionAsync(draft.Id, new() { Action = "supplement", Reason = "Confirm invoice" }));
        var supplementCheck = await WithUnitOfWorkAsync(() => _service.GetClaimVersionCheckAsync(draft.Id));
        supplementCheck.NeedsUpdate.ShouldBeFalse();
        supplementCheck.CurrentVersionId.ShouldBe(check.LatestVersionId);
        (await WithUnitOfWorkAsync(() => _service.SubmitClaimAsync(draft.Id))).CampaignVersionId.ShouldBe(check.LatestVersionId);
    }

    [Fact]
    public async Task Apply_version_should_reject_a_publication_after_the_user_checked()
    {
        var campaign = await PublishedCampaignAsync();
        var draft = await DraftWithEvidenceAsync(campaign.Id);
        await RepublishWaitingDaysAsync(campaign.Id, 2);
        var check = await WithUnitOfWorkAsync(() => _service.GetClaimVersionCheckAsync(draft.Id));
        await RepublishWaitingDaysAsync(campaign.Id, 3);
        (await Should.ThrowAsync<UserFriendlyException>(() => WithUnitOfWorkAsync(() => _service.ApplyClaimVersionAsync(draft.Id, new() { ExpectedLatestVersionId = check.LatestVersionId })))).Message.ShouldContain("changed again");
        var after = await WithUnitOfWorkAsync(() => _service.GetClaimVersionCheckAsync(draft.Id));
        after.CurrentVersionId.ShouldBe(draft.CampaignVersionId!.Value);
        after.NeedsUpdate.ShouldBeTrue();
    }
}
