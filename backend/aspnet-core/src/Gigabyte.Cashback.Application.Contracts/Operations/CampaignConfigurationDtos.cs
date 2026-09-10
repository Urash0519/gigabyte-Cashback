using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Threading.Tasks;

namespace Gigabyte.Cashback.Operations;

public class CampaignConfigurationDto
{
    public string Format { get; set; } = "gigabyte-cashback-campaign";
    public int SchemaVersion { get; set; } = 1;
    public CampaignInput Data { get; set; } = new();
}

public class CampaignConfigurationImportInput : ReasonInput
{
    public JsonElement Configuration { get; set; }
    public Guid? TargetCampaignId { get; set; }
    public string? ConcurrencyStamp { get; set; }
}

public class ConfigurationIssueDto
{
    public string Path { get; set; } = "";
    public string Message { get; set; } = "";
}

public class ConfigurationValidationDto
{
    public List<ConfigurationIssueDto> Errors { get; set; } = [];
    public List<ConfigurationIssueDto> Warnings { get; set; } = [];
}

// Master metadata deliberately excludes rewards, quantity limits and eligibility dates.
// Campaigns take independent copies so later master changes cannot alter claim contracts.
public class ProductCatalogInput
{
    public string Id { get; set; } = "";
    public string Category { get; set; } = "";
    public string Model { get; set; } = "";
    public string Series { get; set; } = "";
    public string Ean { get; set; } = "";
    public string Group { get; set; } = "";
}

public class RetailerCatalogInput
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Country { get; set; } = "DE";
    public string Url { get; set; } = "";
    public string Group { get; set; } = "";
}

public class CampaignCatalogDto
{
    public List<ProductCatalogInput> Products { get; set; } = [];
    public List<RetailerCatalogInput> Retailers { get; set; } = [];
}

public class CampaignCatalogInput : CampaignCatalogDto
{
    [Required, StringLength(2000)] public string Reason { get; set; } = "";
    public string ConflictStrategy { get; set; } = "reject";
}

public partial interface IOperationsAppService
{
    Task<CampaignConfigurationDto> ExportCampaignConfigurationAsync(Guid id, int? version = null);
    Task<ConfigurationValidationDto> ValidateCampaignConfigurationAsync(CampaignInput input);
    Task<CampaignDto> ImportCampaignConfigurationAsync(CampaignConfigurationImportInput input);
    Task<CampaignCatalogDto> GetCampaignCatalogAsync();
    Task<CampaignCatalogDto> SaveCampaignCatalogAsync(CampaignCatalogInput input);
}
