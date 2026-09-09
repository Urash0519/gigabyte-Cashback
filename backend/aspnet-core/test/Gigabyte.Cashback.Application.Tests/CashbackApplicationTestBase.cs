using Volo.Abp.Modularity;

namespace Gigabyte.Cashback;

public abstract class CashbackApplicationTestBase<TStartupModule> : CashbackTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
