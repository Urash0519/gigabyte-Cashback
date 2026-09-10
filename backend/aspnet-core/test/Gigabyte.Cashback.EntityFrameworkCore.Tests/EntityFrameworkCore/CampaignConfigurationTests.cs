using System;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Gigabyte.Cashback.Operations;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Uow;
using Xunit;

namespace Gigabyte.Cashback.EntityFrameworkCore;

[Collection(CashbackTestConsts.CollectionDefinitionName)]
public class CampaignConfigurationTests : CashbackEntityFrameworkCoreTestBase
{
    private IOperationsAppService service = null!;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private async Task<T> Request<T>(Func<Task<T>> action)
    {
        using var scope = ServiceProvider.CreateScope();
        service = scope.ServiceProvider.GetRequiredService<IOperationsAppService>();
        using var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWorkManager>().Begin(requiresNew: true, isTransactional: true);
        var result = await action();
        await uow.CompleteAsync();
        return result;
    }

    private static CampaignInput Complete() => new()
    {
        Name = "Q1 configuration " + Guid.NewGuid(), Slug = "q1-sample", BudgetMinor = 100000,
        Markets = ["DE", "FR", "IT", "ES", "NL"], Languages = ["en", "de", "fr", "it", "es", "nl"],
        PurchaseStart = new DateTime(2026, 1, 1), PurchaseEnd = new DateTime(2026, 3, 31),
        ClaimStart = new DateTime(2026, 1, 15), ClaimEnd = new DateTime(2026, 4, 30),
        WaitingDays = 14, Terms = "Q1 terms", Privacy = "Q1 privacy", TermsVersion = "q1-v1", Faq = "Q1 FAQ",
        Description = "Q1 mock campaign", BannerUrl = "/q1-banner.png", SupportEmail = "support@example.com",
        LegacyFields = { ["privacyVersion"] = "privacy-v2", ["notificationTemplateVersion"] = "q1-email-v1", ["sourceReference"] = "Q1 screenshots" },
        Products = [new() { Id = "x870", Model = "X870 AORUS ELITE", Category = "Motherboard", Series = "AMD", Ean = "", CashbackMinor = 4000, QuantityLimit = 1 }],
        Retailers = [new() { Id = "de-shop", Name = "DE Shop", Country = "DE", Url = "https://example.com", ValidFrom = new DateTime(2026, 1, 1), ValidTo = new DateTime(2026, 3, 31) }]
    };

    private static CampaignConfigurationImportInput Import(CampaignInput data) => new()
    {
        Reason = "UAT configuration import", Configuration = JsonSerializer.SerializeToElement(new CampaignConfigurationDto { Data = data }, Json)
    };

    [Fact]
    public async Task Configuration_round_trip_preserves_all_settings_and_normalizes_legacy_overrides()
    {
        var data = Complete();
        data.LegacyFields["maxClaimsPerHousehold"] = "3";
        data.LegacyFields["exclusivityGroup"] = "Q1-only";
        var original = await Request(() => service.CreateCampaignAsync(data));
        var exported = await Request(() => service.ExportCampaignConfigurationAsync(original.Id));
        var json = JsonSerializer.Serialize(exported, Json);
        json.ShouldNotContain("concurrencyStamp");
        json.ShouldNotContain("reservedMinor");
        json.ShouldNotContain("publishedVersion");
        exported.Data.MaxClaimsPerHousehold.ShouldBe(3);
        exported.Data.ExclusivityGroup.ShouldBe("Q1-only");
        exported.Data.LegacyFields.ShouldNotContainKey("maxClaimsPerHousehold");
        exported.Data.LegacyFields["notificationTemplateVersion"].ShouldBe("q1-email-v1");
        var imported = await Request(() => service.ImportCampaignConfigurationAsync(Import(exported.Data)));
        imported.Id.ShouldNotBe(original.Id);
        imported.PublishedVersion.ShouldBe(0);
        imported.Data.Status.ShouldBe("Draft");
        var again = await Request(() => service.ExportCampaignConfigurationAsync(imported.Id));
        JsonSerializer.Serialize(again, Json).ShouldBe(json);
    }

    [Theory]
    [InlineData("version")]
    [InlineData("unknown")]
    [InlineData("fraction")]
    [InlineData("runtime")]
    [InlineData("duplicate-property")]
    [InlineData("null-list")]
    [InlineData("duplicate-id")]
    [InlineData("market")]
    [InlineData("unsafe-url")]
    public async Task Invalid_imports_have_no_partial_writes(string mutation)
    {
        var input = Import(Complete());
        var document = JsonNode.Parse(input.Configuration.GetRawText())!;
        var data = document["data"]!;
        switch (mutation)
        {
            case "version": document["schemaVersion"] = 2; break;
            case "unknown": data["products"]![0]!["bonusRule"] = "A+B"; break;
            case "fraction": data["products"]![0]!["cashbackMinor"] = 40.5; break;
            case "runtime": data["concurrencyStamp"] = "not-portable"; break;
            case "null-list": data["products"] = null; break;
            case "duplicate-id": ((JsonArray)data["products"]!).Add(JsonSerializer.SerializeToNode(new ProductInput { Id = "X870", Model = "Duplicate", Category = "Motherboard", CashbackMinor = 1000 }, Json)); break;
            case "market": data["market"] = "UK"; break;
            case "unsafe-url": data["bannerUrl"] = "javascript:alert(1)"; break;
        }
        var raw = document.ToJsonString();
        if (mutation == "duplicate-property") raw = raw.Replace("\"schemaVersion\":1", "\"schemaVersion\":1,\"schemaVersion\":2");
        input.Configuration = JsonDocument.Parse(raw).RootElement.Clone();
        var before = (await Request(() => service.GetCampaignsAsync(true))).Count;
        await Should.ThrowAsync<UserFriendlyException>(() => Request(() => service.ImportCampaignConfigurationAsync(input)));
        (await Request(() => service.GetCampaignsAsync(true))).Count.ShouldBe(before);
    }

    [Fact]
    public async Task Target_import_keeps_live_snapshot_budget_and_claim_contract_and_checks_concurrency()
    {
        var campaign = await Request(() => service.CreateCampaignAsync(Complete()));
        campaign = await Request(() => service.PublishCampaignAsync(campaign.Id, new() { Reason = "Publish baseline" }));
        var claim = await Request(() => service.CreateClaimAsync(new() { CampaignId = campaign.Id }));
        var snapshot = await Request(() => service.ExportCampaignConfigurationAsync(campaign.Id, 1));
        campaign = (await Request(() => service.GetCampaignsAsync(true))).Single(x => x.Id == campaign.Id);
        var changed = Complete();
        changed.BudgetMinor = 500000;
        changed.Products[0].CashbackMinor = 9000;
        var input = Import(changed);
        input.TargetCampaignId = campaign.Id;
        input.ConcurrencyStamp = campaign.ConcurrencyStamp;
        var imported = await Request(() => service.ImportCampaignConfigurationAsync(input));
        imported.Id.ShouldBe(campaign.Id);
        imported.PublishedVersion.ShouldBe(1);
        imported.Versions.Count.ShouldBe(1);
        imported.Data.Products[0].CashbackMinor.ShouldBe(9000);
        imported.AvailableMinor.ShouldBe(100000); // Draft budget does not change the live ledger.
        var live = await Request(() => service.ExportCampaignConfigurationAsync(campaign.Id, 1));
        JsonSerializer.Serialize(live, Json).ShouldBe(JsonSerializer.Serialize(snapshot, Json));
        var contract = await Request(() => service.GetClaimCampaignAsync(claim.Id));
        contract.Data.Products[0].CashbackMinor.ShouldBe(4000);
        await Should.ThrowAsync<UserFriendlyException>(() => Request(() => service.ImportCampaignConfigurationAsync(input)));
        (await Request(() => service.ExportCampaignConfigurationAsync(campaign.Id))).Data.Products[0].CashbackMinor.ShouldBe(9000);
    }

    [Fact]
    public async Task Validation_preview_is_read_only_and_publish_uses_same_rules()
    {
        var data = Complete();
        data.Slug = "";
        var validation = await Request(() => service.ValidateCampaignConfigurationAsync(data));
        validation.Errors.ShouldBeEmpty();
        validation.Warnings.ShouldContain(x => x.Path == "slug");
        var name = data.Name;
        data.Name = "";
        (await Request(() => service.ValidateCampaignConfigurationAsync(data))).Errors.ShouldContain(x => x.Path == "name");
        data.Name = name;
        var before = (await Request(() => service.GetCampaignsAsync(true))).Count;
        data.Products.Add(new() { Id = "X870", Model = "Duplicate", Category = "Motherboard", CashbackMinor = 1000 });
        validation = await Request(() => service.ValidateCampaignConfigurationAsync(data));
        validation.Errors.ShouldContain(x => x.Path == "products[1].id");
        (await Request(() => service.GetCampaignsAsync(true))).Count.ShouldBe(before);
        data.Products.RemoveAt(1);
        var campaign = await Request(() => service.CreateCampaignAsync(data));
        // A valid incomplete draft can be saved, but must pass completeness at publish time.
        data.Products.Clear();
        data.ConcurrencyStamp = campaign.ConcurrencyStamp;
        await Request(() => service.SaveCampaignAsync(campaign.Id, data));
        await Should.ThrowAsync<UserFriendlyException>(() => Request(() => service.PublishCampaignAsync(campaign.Id, new() { Reason = "Incomplete" })));
    }

    [Fact]
    public async Task Catalog_conflicts_are_atomic_and_explicit_replacement_never_mutates_campaigns()
    {
        var campaign = await Request(() => service.CreateCampaignAsync(Complete()));
        var input = new CampaignCatalogInput
        {
            Reason = "Seed Q1 master",
            Products = [new() { Id = "x870", Model = "X870 AORUS ELITE", Category = "Motherboard", Group = "Q1 boards" }],
            Retailers = [new() { Id = "de-shop", Name = "DE Shop", Country = "DE", Group = "DACH" }]
        };
        var master = await Request(() => service.SaveCampaignCatalogAsync(input));
        master.Products.ShouldContain(x => x.Id == "x870" && x.Group == "Q1 boards");
        master = await Request(() => service.SaveCampaignCatalogAsync(input)); // Identical import is idempotent.
        master.Products.Count(x => x.Id == "x870").ShouldBe(1);
        input.Products[0].Model = "Changed master";
        input.Products.Add(new() { Id = "new-board", Model = "New board", Category = "Motherboard" });
        await Should.ThrowAsync<UserFriendlyException>(() => Request(() => service.SaveCampaignCatalogAsync(input)));
        master = await Request(() => service.GetCampaignCatalogAsync());
        master.Products.ShouldNotContain(x => x.Id == "new-board");
        master.Products.Single(x => x.Id == "x870").Model.ShouldBe("X870 AORUS ELITE");
        input.ConflictStrategy = "replace";
        master = await Request(() => service.SaveCampaignCatalogAsync(input));
        master.Products.Single(x => x.Id == "x870").Model.ShouldBe("Changed master");
        (await Request(() => service.ExportCampaignConfigurationAsync(campaign.Id))).Data.Products[0].Model.ShouldBe("X870 AORUS ELITE");
    }
}
