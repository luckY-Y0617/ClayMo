using ClayMo.Abp.SqlSugar;
using ClayMo.Framework.Authentication.Abstractions.Security;
using ClayMo.Framework.Authentication.Security;
using ClayMo.Framework.Authorization;
using ClayMo.Framework.SqlSugar.Migrations;
using ClayMo.Framework.SqlSugar;
using ClayMo.Module.TenantManagement.Application;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;

namespace ClayMo.Tools.Platform;

[DependsOn(
    typeof(ClayMoAbpSqlSugarCoreModule),
    typeof(TenantManagementApplicationModule), // 用你实际的 TenantManagement Module 名称替换,
typeof(Volo.Abp.Autofac.AbpAutofacModule),
typeof(Volo.Abp.Castle.AbpCastleCoreModule), // ✅ 关键：注册 ABP 拦截器体系（包括 UOW）
typeof(Volo.Abp.Uow.AbpUnitOfWorkModule),      // ✅ 关键：UOW 拦截器本体
    typeof(ClayMoFrameworkAuthorizationModule)
)]
public sealed class ClayMoToolsAdminModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        // 如果你有额外配置/替换 contributor 等，在这里做
        context.Services.AddScoped<IPasswordHasher, Pbkdf2PasswordHasher>();
    }
}