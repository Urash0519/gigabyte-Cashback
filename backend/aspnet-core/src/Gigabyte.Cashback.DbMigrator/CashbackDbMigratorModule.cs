using Gigabyte.Cashback.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace Gigabyte.Cashback.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(CashbackEntityFrameworkCoreModule),
    typeof(CashbackApplicationContractsModule)
    )]
public class CashbackDbMigratorModule : AbpModule
{
}
