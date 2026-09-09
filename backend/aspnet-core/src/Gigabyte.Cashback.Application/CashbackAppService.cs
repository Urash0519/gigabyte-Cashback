using System;
using System.Collections.Generic;
using System.Text;
using Gigabyte.Cashback.Localization;
using Volo.Abp.Application.Services;

namespace Gigabyte.Cashback;

/* Inherit your application services from this class.
 */
public abstract class CashbackAppService : ApplicationService
{
    protected CashbackAppService()
    {
        LocalizationResource = typeof(CashbackResource);
    }
}
