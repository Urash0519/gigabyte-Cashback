using System;
using System.Threading.Tasks;
using Gigabyte.Cashback.Operations;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Gigabyte.Cashback.EntityFrameworkCore;

[Collection(CashbackTestConsts.CollectionDefinitionName)]
public class OperationsPersistenceTests : CashbackEntityFrameworkCoreTestBase
{
    private readonly IRepository<Campaign, Guid> _campaigns;
    private readonly IRepository<CampaignVersion, Guid> _versions;
    private readonly IRepository<ClaimRecord, Guid> _claims;
    private readonly IRepository<SerialReservation, Guid> _serials;
    private readonly IRepository<PaymentRecord, Guid> _payments;

    public OperationsPersistenceTests()
    {
        _campaigns = GetRequiredService<IRepository<Campaign, Guid>>();
        _versions = GetRequiredService<IRepository<CampaignVersion, Guid>>();
        _claims = GetRequiredService<IRepository<ClaimRecord, Guid>>();
        _serials = GetRequiredService<IRepository<SerialReservation, Guid>>();
        _payments = GetRequiredService<IRepository<PaymentRecord, Guid>>();
    }

    private async Task<ClaimRecord> CreateClaimAsync()
    {
        var campaign = new Campaign(Guid.NewGuid()) { Name = "Persistence test", BudgetMinor = 10000 };
        await _campaigns.InsertAsync(campaign, true);
        var version = new CampaignVersion(Guid.NewGuid(), campaign.Id, 1, "{\"name\":\"Published\"}");
        await _versions.InsertAsync(version, true);
        return await _claims.InsertAsync(new ClaimRecord(Guid.NewGuid())
        {
            CampaignId = campaign.Id, CampaignVersionId = version.Id,
            Reference = Guid.NewGuid().ToString("N"), OwnerId = Guid.NewGuid()
        }, true);
    }

    [Fact]
    public async Task Editing_draft_should_preserve_published_snapshot()
    {
        Guid versionId = Guid.Empty;
        await WithUnitOfWorkAsync(async () =>
        {
            var claim = await CreateClaimAsync();
            versionId = claim.CampaignVersionId!.Value;
            var campaign = await _campaigns.GetAsync(claim.CampaignId);
            campaign.DraftJson = "{\"name\":\"New draft\"}";
            await _campaigns.UpdateAsync(campaign, true);
        });
        await WithUnitOfWorkAsync(async () =>
        {
            (await _versions.GetAsync(versionId)).SnapshotJson.ShouldBe("{\"name\":\"Published\"}");
        });
    }

    [Fact]
    public async Task Same_serial_cannot_be_reserved_by_two_claims()
    {
        await Should.ThrowAsync<DbUpdateException>(async () => await WithUnitOfWorkAsync(async () =>
        {
            var first = await CreateClaimAsync();
            var second = await CreateClaimAsync();
            var serial = Guid.NewGuid().ToString("N");
            await _serials.InsertAsync(new SerialReservation(Guid.NewGuid(), first.Id, serial), true);
            await _serials.InsertAsync(new SerialReservation(Guid.NewGuid(), second.Id, serial), true);
        }));
    }

    [Fact]
    public async Task Same_campaign_version_cannot_be_published_twice()
    {
        await Should.ThrowAsync<DbUpdateException>(async () => await WithUnitOfWorkAsync(async () =>
        {
            var claim = await CreateClaimAsync();
            await _versions.InsertAsync(new CampaignVersion(Guid.NewGuid(), claim.CampaignId, 1, "{}"), true);
        }));
    }

    [Fact]
    public async Task Same_exclusivity_scope_cannot_be_reserved_by_claims_in_different_campaigns()
    {
        await Should.ThrowAsync<DbUpdateException>(async () => await WithUnitOfWorkAsync(async () =>
        {
            var first = await CreateClaimAsync();
            var second = await CreateClaimAsync();
            second.OwnerId = first.OwnerId;
            await _claims.UpdateAsync(second, true);
            first.CampaignId.ShouldNotBe(second.CampaignId);
            var scopeKey = "exclusive-group-owner:" + first.OwnerId.ToString("N");
            var reservations = GetRequiredService<IRepository<RuleReservation, Guid>>();
            await reservations.InsertAsync(new RuleReservation(Guid.NewGuid(), first.Id, scopeKey), true);
            await reservations.InsertAsync(new RuleReservation(Guid.NewGuid(), second.Id, scopeKey), true);
        }));
    }

    [Fact]
    public void Business_aggregate_concurrency_stamps_should_be_EF_concurrency_tokens()
    {
        using var context = new CashbackDbContext(new DbContextOptionsBuilder<CashbackDbContext>().UseSqlite("Data Source=:memory:").Options);
        foreach (var entityType in new[] { typeof(Campaign), typeof(ClaimRecord), typeof(PaymentRecord) })
        {
            var stamp = context.Model.FindEntityType(entityType)!.FindProperty("ConcurrencyStamp")!;
            stamp.IsConcurrencyToken.ShouldBeTrue();
            stamp.IsNullable.ShouldBeFalse();
        }
    }

    [Fact]
    public async Task Payment_attempt_number_should_be_unique_per_instruction()
    {
        await Should.ThrowAsync<DbUpdateException>(async () => await WithUnitOfWorkAsync(async () =>
        {
            var claim = await CreateClaimAsync();
            var payment = await _payments.InsertAsync(new PaymentRecord(Guid.NewGuid(), claim.Id, Guid.NewGuid(), "encrypted", 100, "EUR"), true);
            var attempts = GetRequiredService<IRepository<PaymentAttempt, Guid>>();
            await attempts.InsertAsync(new PaymentAttempt(Guid.NewGuid(), payment.Id, 1, "Initial"), true);
            await attempts.InsertAsync(new PaymentAttempt(Guid.NewGuid(), payment.Id, 1, "Duplicate"), true);
        }));
    }

    [Fact]
    public async Task Unmatched_reconciliation_should_persist_without_known_payment()
    {
        Guid entryId = Guid.NewGuid();
        await WithUnitOfWorkAsync(async () =>
        {
            await GetRequiredService<IRepository<ReconciliationEntry, Guid>>().InsertAsync(new ReconciliationEntry(
                entryId, null, "external-unknown", "statement-1", 100, "EUR", "Succeeded", "Unmatched", "No matching instruction"), true);
        });
        await WithUnitOfWorkAsync(async () =>
        {
            var saved = await GetRequiredService<IRepository<ReconciliationEntry, Guid>>().GetAsync(entryId);
            saved.PaymentId.ShouldBeNull();
            saved.MatchStatus.ShouldBe("Unmatched");
            saved.ExternalPaymentId.ShouldBe("external-unknown");
        });
    }

    [Fact]
    public async Task Same_claim_cannot_receive_two_payment_instructions()
    {
        await Should.ThrowAsync<DbUpdateException>(async () => await WithUnitOfWorkAsync(async () =>
        {
            var claim = await CreateClaimAsync();
            await _payments.InsertAsync(new PaymentRecord(Guid.NewGuid(), claim.Id, Guid.NewGuid(), "encrypted", 100, "EUR"), true);
            await _payments.InsertAsync(new PaymentRecord(Guid.NewGuid(), claim.Id, Guid.NewGuid(), "encrypted", 100, "EUR"), true);
        }));
    }
}
