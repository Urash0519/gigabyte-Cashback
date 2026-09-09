using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Gigabyte.Cashback.Data;
using Volo.Abp.DependencyInjection;

namespace Gigabyte.Cashback.EntityFrameworkCore;

public class EntityFrameworkCoreCashbackDbSchemaMigrator
    : ICashbackDbSchemaMigrator, ITransientDependency
{
    private readonly IServiceProvider _serviceProvider;

    public EntityFrameworkCoreCashbackDbSchemaMigrator(
        IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task MigrateAsync()
    {
        /* We intentionally resolve the CashbackDbContext
         * from IServiceProvider (instead of directly injecting it)
         * to properly get the connection string of the current tenant in the
         * current scope.
         */

        await _serviceProvider
            .GetRequiredService<CashbackDbContext>()
            .Database
            .MigrateAsync();
    }
}
