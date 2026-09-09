using Gigabyte.Cashback.Samples;
using Xunit;

namespace Gigabyte.Cashback.EntityFrameworkCore.Domains;

[Collection(CashbackTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<CashbackEntityFrameworkCoreTestModule>
{

}
