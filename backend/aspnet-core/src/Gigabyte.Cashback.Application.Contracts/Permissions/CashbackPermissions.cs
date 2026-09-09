namespace Gigabyte.Cashback.Permissions;

public static class CashbackPermissions
{
    public const string GroupName = "Cashback";

    public static class Foundation
    {
        public const string Default = GroupName + ".Foundation";
        public const string Verify = Default + ".Verify";
    }

    public static class Campaigns
    {
        public const string Default = GroupName + ".Campaigns";
        public const string Manage = Default + ".Manage";
        public const string Publish = Default + ".Publish";
    }

    public static class Claims
    {
        public const string Default = GroupName + ".Claims";
        public const string Review = Default + ".Review";
        public const string ViewSensitive = Default + ".ViewSensitive";
    }

    public static class Payments
    {
        public const string Default = GroupName + ".Payments";
        public const string Authorize = Default + ".Authorize";
        public const string Reconcile = Default + ".Reconcile";
    }

    public static class Reports
    {
        public const string Default = GroupName + ".Reports";
        public const string Export = Default + ".Export";
    }

    public static class Audit
    {
        public const string Default = GroupName + ".Audit";
    }
}
