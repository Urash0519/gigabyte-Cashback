using Volo.Abp.Settings;

namespace Gigabyte.Cashback.Settings;

public class CashbackSettingDefinitionProvider : SettingDefinitionProvider
{
    public override void Define(ISettingDefinitionContext context)
    {
        //Define your own settings here. Example:
        //context.Add(new SettingDefinition(CashbackSettings.MySetting1));
    }
}
