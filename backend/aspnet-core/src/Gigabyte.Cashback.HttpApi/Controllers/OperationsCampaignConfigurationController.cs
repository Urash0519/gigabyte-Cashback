using System;
using System.Text.Json;
using System.Threading.Tasks;
using Gigabyte.Cashback.Operations;
using Gigabyte.Cashback.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.Auditing;
using Volo.Abp.Validation;

namespace Gigabyte.Cashback.Controllers;

public partial class OperationsController
{
    [HttpGet("campaigns/{id:guid}/configuration")]
    public Task<CampaignConfigurationDto> ExportConfiguration(Guid id, int? version = null) => service.ExportCampaignConfigurationAsync(id, version);

    [Authorize(CashbackPermissions.Campaigns.Manage), DisableAuditing, DisableValidation, HttpPost("campaigns/validate"), RequestSizeLimit(5 * 1024 * 1024)]
    public Task<ConfigurationValidationDto> ValidateConfiguration([FromBody] JsonElement input)
    {
        // Bind raw JSON so ApiController does not turn missing draft fields into an
        // automatic ModelState 400 before our field-addressable preflight can run.
        try
        {
            var data = input.Deserialize<CampaignInput>(new JsonSerializerOptions(JsonSerializerDefaults.Web) { MaxDepth = 32 });
            return service.ValidateCampaignConfigurationAsync(data!);
        }
        catch (JsonException exception)
        {
            return Task.FromResult(new ConfigurationValidationDto
            {
                Errors = [new() { Path = exception.Path ?? "data", Message = "Invalid field type. Check text, dates, arrays and whole-number amounts." }]
            });
        }
    }

    [DisableAuditing, HttpPost("campaigns/import"), RequestSizeLimit(5 * 1024 * 1024)]
    public Task<CampaignDto> ImportConfiguration(CampaignConfigurationImportInput input) => service.ImportCampaignConfigurationAsync(input);

    [HttpGet("catalog")]
    public Task<CampaignCatalogDto> Catalog() => service.GetCampaignCatalogAsync();

    [DisableAuditing, HttpPost("catalog"), RequestSizeLimit(5 * 1024 * 1024)]
    public Task<CampaignCatalogDto> SaveCatalog(CampaignCatalogInput input) => service.SaveCampaignCatalogAsync(input);
}
