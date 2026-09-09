using Microsoft.Extensions.Localization;
using Gigabyte.Cashback.Localization;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Ui.Branding;

namespace Gigabyte.Cashback;

[Dependency(ReplaceServices = true)]
public class CashbackBrandingProvider : DefaultBrandingProvider
{
    private IStringLocalizer<CashbackResource> _localizer;

    public CashbackBrandingProvider(IStringLocalizer<CashbackResource> localizer)
    {
        _localizer = localizer;
    }

    public override string AppName => _localizer["AppName"];
}
