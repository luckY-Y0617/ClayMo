namespace ClayMo.Module.Workspace.Domain.Shared.Activity;

public static class WorkspaceActivityPermissions
{
    public const string GroupName = "workspace";

    public static class Activity
    {
        public const string View = GroupName + ".activity.view";
        // 预留：管理/清理
        public const string Manage = GroupName + ".activity.manage";
    }
}