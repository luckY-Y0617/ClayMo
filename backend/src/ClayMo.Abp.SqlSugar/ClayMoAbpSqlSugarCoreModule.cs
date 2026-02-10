using ClayMo.Abp.SqlSugar.DataSeeding;
using Volo.Abp.Data;
using Volo.Abp.Modularity;
using ClayMo.Abp.Domain;
using ClayMo.Module.AuditLogging.SqlSugar;
using ClayMo.Module.Identity.SqlSugar;
using ClayMo.Framework.SqlSugar;
using ClayMo.Module.TenantManagement.SqlSugar;
using ClayMo.Module.Knowledge.SqlSugar;
using ClayMo.Module.Workspace.SqlSugar;

namespace ClayMo.Abp.SqlSugar;

[DependsOn(
    typeof(ClayMoAbpDomainModule),
    typeof(ClayMoFrameworkSqlSugarModule),
    
    typeof(TenantManagementSqlSugarModule),
    typeof(AuditLoggingSqlSugarModule),
    typeof(KnowledgeSqlSugarModule),
    typeof(WorkspaceSqlSugarModule),
    typeof(ClayMoIdentitySqlSugarModule)
)]

public class ClayMoAbpSqlSugarCoreModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        Configure<AbpDataSeedOptions>(options =>
        {
            options.Contributors.Add<HostDataSeedContributor>();
            options.Contributors.Add<TenantDataSeedContributor>();
        });
    }
}
