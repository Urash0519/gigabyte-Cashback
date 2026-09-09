using Volo.Abp.Modularity;

namespace Gigabyte.Cashback;

[DependsOn(
    typeof(CashbackDomainModule),
    typeof(CashbackTestBaseModule)
)]
public class CashbackDomainTestModule : AbpModule
{

}
