using Volo.Abp.Modularity;
using ClayMo.Module.AuditLogging.Domain;
using ClayMo.Module.AuditLogging.Domain.Shared;
using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using Microsoft.Extensions.DependencyInjection;

namespace ClayMo.Module.AuditLogging.SqlSugar;

[DependsOn(typeof(ClayMoFrameworkSqlSugarModule),
    typeof(AuditLoggingDomainModule),
    typeof(AuditLoggingDomainSharedModule)
    )]
public class AuditLoggingSqlSugarModule: AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddTransient<IMigrationContributor, AuditLoggingMigrationContributor>();
    }
}