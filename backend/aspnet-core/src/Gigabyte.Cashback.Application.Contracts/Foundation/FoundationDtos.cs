using System;
using System.Collections.Generic;

namespace Gigabyte.Cashback.Foundation;

public class FoundationOverviewDto
{
    public string Service { get; set; } = "gigabyte-cashback-api";
    public string Environment { get; set; } = string.Empty;
    public string AbpVersion { get; set; } = string.Empty;
    public string Database { get; set; } = "PostgreSQL";
    public string DatabaseStatus { get; set; } = string.Empty;
    public string BlobProvider { get; set; } = string.Empty;
    public bool AuditLoggingEnabled { get; set; }
    public long AuditLogCount { get; set; }
    public bool VerificationActionsEnabled { get; set; }
    public DateTime ServerTimeUtc { get; set; }
    public List<string> Permissions { get; set; } = [];
    public List<FoundationVerificationDto> Checks { get; set; } = [];
    public List<NotificationOutboxDto> Notifications { get; set; } = [];
    public List<StoredFileDto> Files { get; set; } = [];
}

public class FoundationVerificationDto
{
    public Guid Id { get; set; }
    public string CheckKey { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public DateTime CheckedAt { get; set; }
}

public class NotificationOutboxDto
{
    public Guid Id { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string RecipientMasked { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Attempts { get; set; }
}

public class StoredFileDto
{
    public Guid Id { get; set; }
    public string OriginalName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Sha256 { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class StoredFileContentDto
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public byte[] Content { get; set; } = [];
}

public class SaveVerificationFileInputDto
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public byte[] Content { get; set; } = [];
}
