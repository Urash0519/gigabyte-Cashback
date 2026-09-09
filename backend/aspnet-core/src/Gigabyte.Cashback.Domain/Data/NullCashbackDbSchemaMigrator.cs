using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace Gigabyte.Cashback.Data;

/* This is used if database provider does't define
 * ICashbackDbSchemaMigrator implementation.
 */
public class NullCashbackDbSchemaMigrator : ICashbackDbSchemaMigrator, ITransientDependency
{
    public Task MigrateAsync()
    {
        return Task.CompletedTask;
    }
}
