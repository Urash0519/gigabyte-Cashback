using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Gigabyte.Cashback.Files;
using Gigabyte.Cashback.Notifications;
using Gigabyte.Cashback.Permissions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Volo.Abp;
using Volo.Abp.BlobStoring;
using Volo.Abp.AuditLogging;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Modularity;

namespace Gigabyte.Cashback.Foundation;

[RemoteService(IsEnabled = false)]
public class FoundationAppService : CashbackAppService, IFoundationAppService
{
    private readonly IRepository<FoundationVerification, Guid> _verificationRepository;
    private readonly IRepository<NotificationOutboxMessage, Guid> _notificationRepository;
    private readonly IRepository<StoredFileRecord, Guid> _fileRepository;
    private readonly IRepository<AuditLog, Guid> _auditLogRepository;
    private readonly IBlobContainer<ClaimEvidenceContainer> _blobContainer;
    private readonly IGuidGenerator _guidGenerator;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _hostEnvironment;

    public FoundationAppService(
        IRepository<FoundationVerification, Guid> verificationRepository,
        IRepository<NotificationOutboxMessage, Guid> notificationRepository,
        IRepository<StoredFileRecord, Guid> fileRepository,
        IRepository<AuditLog, Guid> auditLogRepository,
        IBlobContainer<ClaimEvidenceContainer> blobContainer,
        IGuidGenerator guidGenerator,
        IConfiguration configuration,
        IHostEnvironment hostEnvironment)
    {
        _verificationRepository = verificationRepository;
        _notificationRepository = notificationRepository;
        _fileRepository = fileRepository;
        _auditLogRepository = auditLogRepository;
        _blobContainer = blobContainer;
        _guidGenerator = guidGenerator;
        _configuration = configuration;
        _hostEnvironment = hostEnvironment;
    }

    public async Task<FoundationOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var checks = (await _verificationRepository.GetListAsync(cancellationToken: cancellationToken))
            .OrderByDescending(x => x.CheckedAt).Take(8).ToList();
        var notifications = (await _notificationRepository.GetListAsync(cancellationToken: cancellationToken))
            .OrderByDescending(x => x.CreationTime).Take(8).ToList();
        var files = (await _fileRepository.GetListAsync(cancellationToken: cancellationToken))
            .OrderByDescending(x => x.CreationTime).Take(8).ToList();

        return new FoundationOverviewDto
        {
            Environment = _hostEnvironment.EnvironmentName,
            AbpVersion = typeof(AbpModule).Assembly.GetName().Version?.ToString() ?? "10.6.0",
            DatabaseStatus = "Connected",
            BlobProvider = _configuration["BlobStorage:Provider"] ?? "FileSystem",
            AuditLoggingEnabled = _configuration.GetValue("Auditing:IsEnabled", true),
            AuditLogCount = await _auditLogRepository.GetCountAsync(cancellationToken),
            VerificationActionsEnabled = _configuration.GetValue("Foundation:AllowVerificationActions", false),
            ServerTimeUtc = DateTime.UtcNow,
            Permissions = PermissionNames,
            Checks = checks.Select(x => new FoundationVerificationDto
            {
                Id = x.Id, CheckKey = x.CheckKey, Status = x.Status, Detail = x.Detail, CheckedAt = x.CheckedAt
            }).ToList(),
            Notifications = notifications.Select(x => new NotificationOutboxDto
            {
                Id = x.Id, Channel = x.Channel, RecipientMasked = x.RecipientMasked,
                Subject = x.Subject, Status = x.Status, Attempts = x.Attempts
            }).ToList(),
            Files = files.Select(ToFileDto).ToList()
        };
    }

    public async Task<FoundationOverviewDto> RunVerificationAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var marker = Encoding.UTF8.GetBytes($"GIGABYTE Cashback storage verification {now:O}");
        await SaveVerificationFileAsync(new SaveVerificationFileInputDto
        {
            FileName = "foundation-check.txt",
            ContentType = "text/plain",
            Content = marker
        }, cancellationToken);

        await _verificationRepository.InsertAsync(new FoundationVerification(
            _guidGenerator.Create(), "database", "Ready", "PostgreSQL read/write verification completed.", now),
            autoSave: true, cancellationToken: cancellationToken);
        await _notificationRepository.InsertAsync(new NotificationOutboxMessage(
            _guidGenerator.Create(), "Email", "u***@example.test", "Foundation verification notification"),
            autoSave: true, cancellationToken: cancellationToken);

        return await GetOverviewAsync(cancellationToken);
    }

    public async Task<StoredFileDto> SaveVerificationFileAsync(
        SaveVerificationFileInputDto input,
        CancellationToken cancellationToken = default)
    {
        Check.NotNull(input, nameof(input));
        Check.NotNullOrWhiteSpace(input.FileName, nameof(input.FileName), FoundationConsts.MaxNameLength);
        input.ContentType = string.IsNullOrWhiteSpace(input.ContentType) ? "application/octet-stream" : input.ContentType;

        if (input.Content.Length == 0 || input.Content.LongLength > FoundationConsts.VerificationFileSizeLimit)
        {
            throw new BusinessException(CashbackDomainErrorCodes.VerificationFileInvalid)
                .WithData("MaxBytes", FoundationConsts.VerificationFileSizeLimit);
        }

        var id = _guidGenerator.Create();
        var extension = Path.GetExtension(Path.GetFileName(input.FileName));
        var blobName = $"foundation/{id:N}{extension}";
        var bytes = input.Content;
        var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

        await _blobContainer.SaveAsync(blobName, bytes, overrideExisting: false, cancellationToken: cancellationToken);
        var record = new StoredFileRecord(id, blobName, Path.GetFileName(input.FileName), input.ContentType, bytes.LongLength, hash);
        await _fileRepository.InsertAsync(record, autoSave: true, cancellationToken: cancellationToken);
        return ToFileDto(record);
    }

    public async Task<StoredFileContentDto> GetVerificationFileAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var record = await _fileRepository.GetAsync(id, cancellationToken: cancellationToken);
        return new StoredFileContentDto
        {
            FileName = record.OriginalName,
            ContentType = record.ContentType,
            Content = await _blobContainer.GetAllBytesAsync(record.BlobName, cancellationToken)
        };
    }

    private static StoredFileDto ToFileDto(StoredFileRecord record) => new()
    {
        Id = record.Id,
        OriginalName = record.OriginalName,
        ContentType = record.ContentType,
        Size = record.Size,
        Sha256 = record.Sha256,
        CreatedAt = record.CreationTime
    };

    private static readonly List<string> PermissionNames =
    [
        CashbackPermissions.Foundation.Default,
        CashbackPermissions.Foundation.Verify,
        CashbackPermissions.Campaigns.Manage,
        CashbackPermissions.Campaigns.Publish,
        CashbackPermissions.Claims.Review,
        CashbackPermissions.Claims.ViewSensitive,
        CashbackPermissions.Payments.Authorize,
        CashbackPermissions.Payments.Reconcile,
        CashbackPermissions.Reports.Export,
        CashbackPermissions.Audit.Default
    ];
}
