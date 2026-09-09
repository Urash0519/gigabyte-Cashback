using Xunit;

namespace Gigabyte.Cashback.EntityFrameworkCore;

[CollectionDefinition(CashbackTestConsts.CollectionDefinitionName)]
public class CashbackEntityFrameworkCoreCollection : ICollectionFixture<CashbackEntityFrameworkCoreFixture>
{

}
