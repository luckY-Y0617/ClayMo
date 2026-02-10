using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;

namespace ClayMo.Module.Workspace.SqlSugar;

[DependsOn(typeof(ClayMoFrameworkSqlSugarModule))]
public class WorkspaceSqlSugarModule: AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddTransient<IMigrationContributor, WorkspaceMigrationContributor>();
    }
}