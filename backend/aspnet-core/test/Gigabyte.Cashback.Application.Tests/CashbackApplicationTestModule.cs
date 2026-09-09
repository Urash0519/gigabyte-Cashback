using Volo.Abp.Modularity;

namespace Gigabyte.Cashback;

[DependsOn(
    typeof(CashbackApplicationModule),
    typeof(CashbackDomainTestModule)
)]
public class CashbackApplicationTestModule : AbpModule
{

}
