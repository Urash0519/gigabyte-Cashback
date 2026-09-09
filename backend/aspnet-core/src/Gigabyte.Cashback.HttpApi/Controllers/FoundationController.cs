using System;
using System.Threading;
using System.Threading.Tasks;
using System.IO;
using Gigabyte.Cashback.Foundation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Volo.Abp.AspNetCore.Mvc;

namespace Gigabyte.Cashback.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/foundation")]
public class FoundationController : AbpControllerBase
{
    private readonly IFoundationAppService _foundationAppService;
    private readonly IConfiguration _configuration;

    public FoundationController(IFoundationAppService foundationAppService, IConfiguration configuration)
    {
        _foundationAppService = foundationAppService;
        _configuration = configuration;
    }

    [HttpGet("overview")]
    public Task<FoundationOverviewDto> GetOverviewAsync(CancellationToken cancellationToken)
    {
        return _foundationAppService.GetOverviewAsync(cancellationToken);
    }

    [HttpPost("verify")]
    public async Task<ActionResult<FoundationOverviewDto>> VerifyAsync(CancellationToken cancellationToken)
    {
        if (!ActionsEnabled())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Foundation verification actions are disabled." });
        }

        return await _foundationAppService.RunVerificationAsync(cancellationToken);
    }

    [HttpPost("files")]
    [RequestSizeLimit(FoundationConsts.VerificationFileSizeLimit)]
    public async Task<ActionResult<StoredFileDto>> UploadAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (!ActionsEnabled())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Foundation verification actions are disabled." });
        }

        if (file.Length == 0 || file.Length > FoundationConsts.VerificationFileSizeLimit)
        {
            return BadRequest(new { error = "Choose a non-empty sample file up to 1 MiB." });
        }

        await using var stream = file.OpenReadStream();
        await using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken);
        return await _foundationAppService.SaveVerificationFileAsync(new SaveVerificationFileInputDto
        {
            FileName = file.FileName,
            ContentType = file.ContentType,
            Content = buffer.ToArray()
        }, cancellationToken);
    }

    [HttpGet("files/{id:guid}")]
    public async Task<IActionResult> DownloadAsync(Guid id, CancellationToken cancellationToken)
    {
        if (!ActionsEnabled())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Foundation verification actions are disabled." });
        }

        var file = await _foundationAppService.GetVerificationFileAsync(id, cancellationToken);
        return File(file.Content, file.ContentType, file.FileName);
    }

    private bool ActionsEnabled() => _configuration.GetValue("Foundation:AllowVerificationActions", false);
}
