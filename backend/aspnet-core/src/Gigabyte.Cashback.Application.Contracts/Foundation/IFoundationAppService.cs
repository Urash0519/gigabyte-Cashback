using System;
using System.Threading;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Gigabyte.Cashback.Foundation;

public interface IFoundationAppService : IApplicationService
{
    Task<FoundationOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default);
    Task<FoundationOverviewDto> RunVerificationAsync(CancellationToken cancellationToken = default);
    Task<StoredFileDto> SaveVerificationFileAsync(SaveVerificationFileInputDto input, CancellationToken cancellationToken = default);
    Task<StoredFileContentDto> GetVerificationFileAsync(Guid id, CancellationToken cancellationToken = default);
}
