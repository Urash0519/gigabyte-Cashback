using Gigabyte.Cashback.Samples;
using Xunit;

namespace Gigabyte.Cashback.EntityFrameworkCore.Applications;

[Collection(CashbackTestConsts.CollectionDefinitionName)]
public class EfCoreSampleAppServiceTests : SampleAppServiceTests<CashbackEntityFrameworkCoreTestModule>
{

}
