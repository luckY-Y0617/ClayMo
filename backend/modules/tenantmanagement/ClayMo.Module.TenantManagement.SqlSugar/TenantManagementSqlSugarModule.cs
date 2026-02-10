using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using ClayMo.Module.TenantManagement.Domain;

namespace ClayMo.Module.TenantManagement.SqlSugar;

[DependsOn(typeof(TenantManagementDomainModule))]
public class TenantManagementSqlSugarModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddTransient<ISqlSugarConnectionResolver, SqlSugarConnectionResolver>();
        context.Services.AddTransient<IMigrationContributor, TenantManagementMigrationContributor>();

        Configure<SqlSugarEntityOptions>(options =>
        {
            options.Entity<TenantAggregateRoot>(entityOptions =>
            {
                entityOptions.DefaultWithDetailsFunc = query =>
                    query.Includes(x => x.ConnectionStrings);
            });
        });
    }

}