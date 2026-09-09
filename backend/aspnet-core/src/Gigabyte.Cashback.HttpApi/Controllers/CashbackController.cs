using Gigabyte.Cashback.Localization;
using Volo.Abp.AspNetCore.Mvc;

namespace Gigabyte.Cashback.Controllers;

/* Inherit your controllers from this class.
 */
public abstract class CashbackController : AbpControllerBase
{
    protected CashbackController()
    {
        LocalizationResource = typeof(CashbackResource);
    }
}
