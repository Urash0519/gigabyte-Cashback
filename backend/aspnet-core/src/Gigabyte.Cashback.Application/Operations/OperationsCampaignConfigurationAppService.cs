using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Gigabyte.Cashback.Permissions;
using Volo.Abp;
using Volo.Abp.Auditing;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Uow;
using Volo.Abp.Validation;

namespace Gigabyte.Cashback.Operations;

public partial class OperationsAppService
{
    private IRepository<CampaignCatalogEntry, Guid> CatalogEntries => LazyServiceProvider.LazyGetRequiredService<IRepository<CampaignCatalogEntry, Guid>>();
    private static readonly JsonSerializerOptions ConfigurationJson = new(Json)
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        MaxDepth = 32
    };

    public async Task<CampaignConfigurationDto> ExportCampaignConfigurationAsync(Guid id, int? version = null)
    {
        await Permit(CashbackPermissions.Campaigns.Manage);
        var campaign = await campaigns.GetAsync(id);
        var data = Decode<CampaignInput>(campaign.DraftJson);
        if (version.HasValue)
        {
            var snapshot = (await versions.GetListAsync(x => x.CampaignId == id && x.Version == version.Value)).SingleOrDefault();
            Require(snapshot != null, "Published campaign version was not found.");
            data = Decode<CampaignInput>(snapshot!.SnapshotJson);
        }
        data.ConcurrencyStamp = null;
        // Effective rules from old snapshots win once; other legacy settings remain intact.
        if (data.LegacyFields.TryGetValue("maxClaimsPerHousehold", out var household) && !int.TryParse(household, out _))
            throw new UserFriendlyException("Legacy household configuration is invalid; correct the draft before exporting.");
        CampaignConfigurationValidation.NormalizeLegacyOverrides(data);
        return new() { Data = data };
    }

    [DisableAuditing, DisableValidation]
    public async Task<ConfigurationValidationDto> ValidateCampaignConfigurationAsync(CampaignInput input)
    {
        await Permit(CashbackPermissions.Campaigns.Manage);
        return CampaignConfigurationValidation.Validate(input);
    }

    private static void EnsureValidConfiguration(CampaignInput input, bool complete)
    {
        var result = CampaignConfigurationValidation.Validate(input, complete);
        Require(result.Errors.Count == 0, string.Join("\n", result.Errors.Take(30).Select(x => x.Path + ": " + x.Message)));
        CampaignConfigurationValidation.NormalizeLegacyOverrides(input);
    }

    [DisableAuditing, UnitOfWork(isTransactional: true)]
    public async Task<CampaignDto> ImportCampaignConfigurationAsync(CampaignConfigurationImportInput input)
    {
        await Permit(CashbackPermissions.Campaigns.Manage);
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 2000, "An import reason is required (maximum 2000 characters).");
        Require(input.Configuration.ValueKind == JsonValueKind.Object && input.Configuration.GetRawText().Length <= 5 * 1024 * 1024, "Provide a campaign configuration JSON object up to 5 MB.");
        CampaignConfigurationDto envelope;
        try
        {
            EnsureUniqueJsonProperties(input.Configuration);
            Require(input.Configuration.TryGetProperty("format", out var format) && format.GetString() == "gigabyte-cashback-campaign", "Unsupported campaign configuration format.");
            Require(input.Configuration.TryGetProperty("schemaVersion", out var version) && version.TryGetInt32(out var schemaVersion) && schemaVersion == 1, "Unsupported campaign configuration schemaVersion; expected 1.");
            Require(input.Configuration.TryGetProperty("data", out var rawData) && rawData.ValueKind == JsonValueKind.Object, "Configuration data is required.");
            Require(!rawData.EnumerateObject().Any(x => string.Equals(x.Name, "concurrencyStamp", StringComparison.OrdinalIgnoreCase)), "Remove runtime concurrencyStamp from configuration data; provide the target concurrencyStamp separately.");
            envelope = input.Configuration.Deserialize<CampaignConfigurationDto>(ConfigurationJson)!;
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException or FormatException)
        {
            throw new UserFriendlyException("Invalid configuration JSON: " + (e is JsonException json ? json.Message : "Check field names and value types."));
        }
        EnsureValidConfiguration(envelope.Data, true);
        envelope.Data.ConcurrencyStamp = null;
        envelope.Data.Status = "Draft";
        CampaignDto result;
        if (input.TargetCampaignId.HasValue)
        {
            envelope.Data.ConcurrencyStamp = input.ConcurrencyStamp;
            result = await SaveCampaignAsync(input.TargetCampaignId.Value, envelope.Data);
        }
        else
            result = await CreateCampaignAsync(envelope.Data);
        await Log(result.Id, "CampaignConfigurationImported", input.Reason);
        return result;
    }

    private static void EnsureUniqueJsonProperties(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var property in value.EnumerateObject())
            {
                Require(names.Add(property.Name), "Duplicate JSON property: " + property.Name);
                EnsureUniqueJsonProperties(property.Value);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
            foreach (var item in value.EnumerateArray()) EnsureUniqueJsonProperties(item);
    }

    public async Task<CampaignCatalogDto> GetCampaignCatalogAsync()
    {
        await Permit(CashbackPermissions.Campaigns.Manage);
        var entries = await CatalogEntries.GetListAsync();
        return new()
        {
            Products = entries.Where(x => x.Kind == "Product").Select(x => Decode<ProductCatalogInput>(x.DataJson)).OrderBy(x => x.Id).ToList(),
            Retailers = entries.Where(x => x.Kind == "Retailer").Select(x => Decode<RetailerCatalogInput>(x.DataJson)).OrderBy(x => x.Country).ThenBy(x => x.Name).ToList()
        };
    }

    [DisableAuditing, UnitOfWork(isTransactional: true)]
    public async Task<CampaignCatalogDto> SaveCampaignCatalogAsync(CampaignCatalogInput input)
    {
        await Permit(CashbackPermissions.Campaigns.Manage);
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 2000, "A catalog change reason is required (maximum 2000 characters).");
        Require(input.ConflictStrategy is "reject" or "replace", "Catalog conflictStrategy must be reject or replace.");
        Require(input.Products != null && input.Retailers != null && input.Products.Count <= CampaignConfigurationValidation.MaximumRows && input.Retailers.Count <= CampaignConfigurationValidation.MaximumRows, "Provide product and retailer arrays of at most 5000 rows each.");
        var errors = new List<string>();
        void Error(string path, string message) => errors.Add(path + ": " + message);
        CampaignConfigurationValidation.ValidateIds(input.Products!.Select(x => x?.Id), "products", Error);
        CampaignConfigurationValidation.ValidateIds(input.Retailers!.Select(x => x?.Id), "retailers", Error);
        foreach (var p in input.Products!.Where(x => x != null))
        {
            if (string.IsNullOrWhiteSpace(p.Model) || string.IsNullOrWhiteSpace(p.Category) || !CampaignConfigurationValidation.ValidText(p.Model, 256) || !CampaignConfigurationValidation.ValidText(p.Category, 128) || !CampaignConfigurationValidation.ValidText(p.Series, 256) || !CampaignConfigurationValidation.ValidText(p.Ean, 128) || !CampaignConfigurationValidation.ValidText(p.Group, 128))
                Error(p.Id, "Product model/category are required; metadata exceeds supported text size or contains nulls.");
        }
        foreach (var r in input.Retailers!.Where(x => x != null))
        {
            if (string.IsNullOrWhiteSpace(r.Name) || !CampaignConfigurationValidation.ValidText(r.Name, 256) || !CampaignConfigurationValidation.ValidText(r.Group, 128) || !CampaignConfigurationValidation.SupportedMarkets.Contains(r.Country) || !CampaignConfigurationValidation.SafeUrl(r.Url))
                Error(r.Id, "Retailer name, supported country and safe URL are required; check text size.");
        }
        Require(errors.Count == 0, string.Join("\n", errors.Take(30)));
        var existing = (await CatalogEntries.GetListAsync()).ToDictionary(x => (x.Kind, x.NormalizedKey));
        var changes = input.Products!.Select(x => (Kind: "Product", Key: x.Id.ToUpperInvariant(), Json: Encode(x)))
            .Concat(input.Retailers!.Select(x => (Kind: "Retailer", Key: x.Id.ToUpperInvariant(), Json: Encode(x)))).ToList();
        // Resolve all conflicts before staging any insert, so validation never partially applies a batch.
        if (input.ConflictStrategy == "reject")
            foreach (var change in changes)
                if (existing.TryGetValue((change.Kind, change.Key), out var entry) && entry.DataJson != change.Json)
                    Error(change.Kind + ":" + change.Key, "Already exists with different metadata. Explicitly select replace to update master metadata.");
        Require(errors.Count == 0, string.Join("\n", errors.Take(30)));
        foreach (var change in changes)
        {
            if (existing.TryGetValue((change.Kind, change.Key), out var entry))
            {
                if (entry.DataJson == change.Json) continue;
                entry.DataJson = change.Json;
                await CatalogEntries.UpdateAsync(entry);
                await Log(entry.Id, "CampaignCatalogUpdated", input.Reason);
            }
            else
            {
                var added = new CampaignCatalogEntry(GuidGenerator.Create(), change.Kind, change.Key, change.Json);
                await CatalogEntries.InsertAsync(added);
                await Log(added.Id, "CampaignCatalogCreated", input.Reason);
            }
        }
        if (CurrentUnitOfWork != null) await CurrentUnitOfWork.SaveChangesAsync();
        return await GetCampaignCatalogAsync();
    }
}
