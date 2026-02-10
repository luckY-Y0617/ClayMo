using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using ClayMo.Framework.Authorization.Abstractions.Permissions;
using ClayMo.Module.Workspace.Domain.Shared.Activity;
using ClayMo.Module.Workspace.Domain.Shared.Goal.Permissions;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.Application.Authorization;

public sealed class WorkspacePermissionDefinitionProvider : PermissionDefinitionProvider, ITransientDependency
{
    private const string ModuleCode = "workspace";

    private static readonly IReadOnlyDictionary<string, string> GroupDisplayNames =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["dashboard"] = "仪表盘",
            ["activity"] = "动态"
        };

    private static readonly IReadOnlyDictionary<string, string> ActionDisplayNames =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["view"] = "查看",
            ["manage"] = "管理"
        };

    public override void Define(IPermissionDefinitionContext context)
    {
        context.AddModule(ModuleCode, "工作台", "工作台相关权限定义");

        DefineFromType(context, typeof(WorkspaceDashboardPermissions));
        DefineFromType(context, typeof(WorkspaceActivityPermissions));
    }

    private static void DefineFromType(IPermissionDefinitionContext context, Type root)
    {
        var permissionCodes = GetPermissionCodes(root);
        foreach (var permissionCode in permissionCodes)
        {
            var groupCode = ResolveGroupCode(permissionCode);
            var groupDisplayName = ResolveGroupDisplayName(groupCode);
            var group = context.AddGroup(ModuleCode, groupCode, groupDisplayName, $"工作台 - {groupDisplayName}");

            var displayName = ResolvePermissionDisplayName(permissionCode, groupDisplayName);
            group.AddPermission(permissionCode, displayName, $"允许{displayName}");
        }
    }

    private static IReadOnlyList<string> GetPermissionCodes(Type root)
    {
        var codes = new List<string>();
        foreach (var nested in root.GetNestedTypes(BindingFlags.Public | BindingFlags.Static))
        {
            foreach (var field in nested.GetFields(BindingFlags.Public | BindingFlags.Static))
            {
                if (field.FieldType != typeof(string))
                {
                    continue;
                }

                var value = field.GetValue(null) as string;
                if (!string.IsNullOrWhiteSpace(value))
                {
                    codes.Add(value);
                }
            }
        }

        return codes.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static string ResolveGroupCode(string permissionCode)
    {
        var parts = permissionCode.Split('.', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length >= 2 ? parts[1] : "workspace";
    }

    private static string ResolveGroupDisplayName(string groupCode)
        => GroupDisplayNames.TryGetValue(groupCode, out var name)
            ? name
            : groupCode;

    private static string ResolvePermissionDisplayName(string permissionCode, string groupDisplayName)
    {
        var action = permissionCode.Split('.', StringSplitOptions.RemoveEmptyEntries).LastOrDefault();
        if (action != null && ActionDisplayNames.TryGetValue(action, out var name))
        {
            return $"{groupDisplayName}{name}";
        }

        return permissionCode;
    }
}

