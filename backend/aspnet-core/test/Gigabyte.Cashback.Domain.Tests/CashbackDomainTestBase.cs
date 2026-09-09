using Volo.Abp.Modularity;

namespace Gigabyte.Cashback;

/* Inherit from this class for your domain layer tests. */
public abstract class CashbackDomainTestBase<TStartupModule> : CashbackTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
