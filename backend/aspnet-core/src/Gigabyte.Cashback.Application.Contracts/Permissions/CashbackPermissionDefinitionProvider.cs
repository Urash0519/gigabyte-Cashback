using Gigabyte.Cashback.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace Gigabyte.Cashback.Permissions;

public class CashbackPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup(CashbackPermissions.GroupName, L("Permission:Cashback"));
        var foundation = group.AddPermission(CashbackPermissions.Foundation.Default, L("Permission:Foundation"));
        foundation.AddChild(CashbackPermissions.Foundation.Verify, L("Permission:Foundation.Verify"));

        var campaigns = group.AddPermission(CashbackPermissions.Campaigns.Default, L("Permission:Campaigns"));
        campaigns.AddChild(CashbackPermissions.Campaigns.Manage, L("Permission:Campaigns.Manage"));
        campaigns.AddChild(CashbackPermissions.Campaigns.Publish, L("Permission:Campaigns.Publish"));

        var claims = group.AddPermission(CashbackPermissions.Claims.Default, L("Permission:Claims"));
        claims.AddChild(CashbackPermissions.Claims.Review, L("Permission:Claims.Review"));
        claims.AddChild(CashbackPermissions.Claims.ViewSensitive, L("Permission:Claims.ViewSensitive"));

        var payments = group.AddPermission(CashbackPermissions.Payments.Default, L("Permission:Payments"));
        payments.AddChild(CashbackPermissions.Payments.Authorize, L("Permission:Payments.Authorize"));
        payments.AddChild(CashbackPermissions.Payments.Reconcile, L("Permission:Payments.Reconcile"));

        var reports = group.AddPermission(CashbackPermissions.Reports.Default, L("Permission:Reports"));
        reports.AddChild(CashbackPermissions.Reports.Export, L("Permission:Reports.Export"));
        group.AddPermission(CashbackPermissions.Audit.Default, L("Permission:Audit"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<CashbackResource>(name);
    }
}
