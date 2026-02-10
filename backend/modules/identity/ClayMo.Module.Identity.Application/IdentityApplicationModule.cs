using ClayMo.Framework.Authorization.Abstractions.Permissions;
using ClayMo.Module.Identity.Application.Contracts;
using ClayMo.Module.Identity.Application.Contracts.Users;
using ClayMo.Module.Identity.Domain;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.AutoMapper;
using Volo.Abp.Modularity;

namespace ClayMo.Module.Identity.Application;

[DependsOn(
    typeof(ClayMoFrameworkIdentityDomainModule),
    typeof(ClayMoFrameworkIdentityApplicationContractsModule))]
public class IdentityApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddAutoMapperObjectMapper<IdentityApplicationModule>();

        Configure<AbpAutoMapperOptions>(options =>
        {
            options.AddMaps<IdentityApplicationModule>();
        });
        
        context.Services.AddTransient<IPermissionGrantProvider, SystemPermissionStore>();
        context.Services.AddTransient<IAuthUserProfileProvider, UserInfoStore>();
    }
}

