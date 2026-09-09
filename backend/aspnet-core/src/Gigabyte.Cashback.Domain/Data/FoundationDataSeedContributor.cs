using System;
using System.Threading.Tasks;
using Gigabyte.Cashback.Foundation;
using Gigabyte.Cashback.Notifications;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;

namespace Gigabyte.Cashback.Data;

public class FoundationDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IRepository<FoundationVerification, Guid> _verificationRepository;
    private readonly IRepository<NotificationOutboxMessage, Guid> _notificationRepository;
    private readonly IGuidGenerator _guidGenerator;

    public FoundationDataSeedContributor(
        IRepository<FoundationVerification, Guid> verificationRepository,
        IRepository<NotificationOutboxMessage, Guid> notificationRepository,
        IGuidGenerator guidGenerator)
    {
        _verificationRepository = verificationRepository;
        _notificationRepository = notificationRepository;
        _guidGenerator = guidGenerator;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        if (await _verificationRepository.GetCountAsync() == 0)
        {
            await _verificationRepository.InsertAsync(new FoundationVerification(
                _guidGenerator.Create(),
                "database",
                "Ready",
                "ABP migration and seed completed.",
                DateTime.UtcNow));
        }

        if (await _notificationRepository.GetCountAsync() == 0)
        {
            await _notificationRepository.InsertAsync(new NotificationOutboxMessage(
                _guidGenerator.Create(),
                "Email",
                "t***@example.test",
                "Cashback notification outbox ready"));
        }
    }
}
