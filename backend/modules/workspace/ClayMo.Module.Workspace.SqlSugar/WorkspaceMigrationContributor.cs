using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using ClayMo.Framework.SqlSugar.Migrations;
using ClayMo.Module.Workspace.Domain.Activity;
using ClayMo.Module.Workspace.Domain.Focus;
using ClayMo.Module.Workspace.Domain.Goal;

namespace ClayMo.Module.Workspace.SqlSugar;

[Migration(MigrationScopes.Tenant, order: 210)]
public sealed class WorkspaceMigrationContributor : CodeFirstMigrationContributorBase
{
    public override string Id => "workspace/tenant/codefirst";
    public override string Description => "Workspace module tenant tables (CodeFirst InitTables)";

    protected override IEnumerable<Type> GetEntityTypes()
    {
        return new[]
        {
            typeof(ActivityLog),

            typeof(FocusSession),
            typeof(FocusSegment),

            typeof(GoalDefinition),
            typeof(GoalDailyProgress),
            typeof(WeeklyFocusItem),
            typeof(CheckIn)
        };
    }
}
