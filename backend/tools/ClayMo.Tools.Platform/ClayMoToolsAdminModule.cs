using ClayMo.Abp.SqlSugar;
using ClayMo.Framework.Authentication.Abstractions.Security;
using ClayMo.Framework.Authentication.Security;
using ClayMo.Framework.Authorization;
using ClayMo.Module.TenantManagement.Application;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;

namespace ClayMo.Tools.Platform;

[DependsOn(
    typeof(ClayMoAbpSqlSugarCoreModule),
    typeof(TenantManagementApplicationModule), 
    typeof(Volo.Abp.Autofac.AbpAutofacModule),
    typeof(Volo.Abp.Castle.AbpCastleCoreModule),
    typeof(Volo.Abp.Uow.AbpUnitOfWorkModule),     
    typeof(ClayMoFrameworkAuthorizationModule)
)]
public sealed class ClayMoToolsAdminModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddScoped<IPasswordHasher, Pbkdf2PasswordHasher>();
    }
}