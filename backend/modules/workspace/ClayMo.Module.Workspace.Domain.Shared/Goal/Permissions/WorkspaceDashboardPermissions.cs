namespace ClayMo.Module.Workspace.Domain.Shared.Goal.Permissions;

public static class WorkspaceDashboardPermissions
{
    public const string GroupName = "workspace";

    public static class Dashboard
    {
        public const string View = GroupName + ".dashboard.view";
        public const string Manage = GroupName + ".dashboard.manage";
    }
}