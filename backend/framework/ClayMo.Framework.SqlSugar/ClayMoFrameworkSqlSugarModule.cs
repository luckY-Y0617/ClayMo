using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using ClayMo.Framework.SqlSugar.Contributor;
using ClayMo.Framework.SqlSugar.DependencyInjection;
using ClayMo.Framework.SqlSugar.Interceptors;
using ClayMo.Framework.SqlSugar.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Domain;
using Volo.Abp.Modularity;
using Volo.Abp.MultiTenancy;
using Volo.Abp.Uow;

namespace ClayMo.Framework.SqlSugar;

[DependsOn(
    typeof(AbpDddDomainModule),
    typeof(AbpUnitOfWorkModule),
    typeof(AbpMultiTenancyModule)
)]
public class ClayMoFrameworkSqlSugarModule : AbpModule
{
    private const string SectionName = "SqlSugar";

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var services = context.Services;
        var configuration = services.GetConfiguration();

        // 配置 SqlSugar 连接选项
        var section = configuration.GetSection(SectionName);
        if (section.Exists())
        {
            services.Configure<SqlSugarDbConnectionOptions>(section);
        }
        else
        {
            services.Configure<SqlSugarDbConnectionOptions>(_ => { });
        }

        // 核心服务注册
        services.AddScoped<ISqlSugarDbContextFactory, SqlSugarDbContextFactory>();
        services.AddTransient(typeof(ISqlSugarDbContextProvider<>), typeof(UnitOfWorkDbContextProvider<>));

        // Contributor 注册
        services.AddSingleton<ISqlSugarClientContributor, DefaultEntityServiceContributor>();
        services.AddSingleton<ISqlSugarClientContributor, InterceptorAttachmentContributor>();
        services.AddSingleton<ISqlSugarClientContributor, SoftDeleteFilterContributor>();

        // Interceptor 注册
        services.AddTransient<ISqlSugarInterceptor, AdoLoggingInterceptor>();
        services.AddTransient<ISqlSugarInterceptor, AuditInterceptor>();

        // 实体导航加载策略 Options
        services.Configure<SqlSugarEntityOptions>(_ => { });

        // Repository 注册
        var options = new SqlSugarDbContextRegistrationOptions { AddDefaultRepositories = true };
        var registrar = new SqlSugarRepositoryRegistrar(options);
        registrar.RegisterRepositories(services, typeof(SqlSugarDbContext));

        // Migration 支持
        services.AddTransient<IMigrationRunner, SqlSugarMigrationRunner>();
    }
}