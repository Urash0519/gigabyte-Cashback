using System;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp;
using Gigabyte.Cashback.Foundation;

namespace Gigabyte.Cashback.Files;

public class StoredFileRecord : AuditedAggregateRoot<Guid>
{
    public string BlobName { get; private set; } = string.Empty;
    public string OriginalName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long Size { get; private set; }
    public string Sha256 { get; private set; } = string.Empty;

    protected StoredFileRecord()
    {
    }

    public StoredFileRecord(Guid id, string blobName, string originalName, string contentType, long size, string sha256)
        : base(id)
    {
        BlobName = Check.NotNullOrWhiteSpace(blobName, nameof(blobName), FoundationConsts.MaxNameLength);
        OriginalName = Check.NotNullOrWhiteSpace(originalName, nameof(originalName), FoundationConsts.MaxNameLength);
        ContentType = Check.NotNullOrWhiteSpace(contentType, nameof(contentType), FoundationConsts.MaxContentTypeLength);
        if (size <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(size), size, "File size must be positive.");
        }
        Size = size;
        Sha256 = Check.NotNullOrWhiteSpace(sha256, nameof(sha256), FoundationConsts.MaxHashLength);
    }
}
