using Volo.Abp.AutoMapper;
using Volo.Abp.Modularity;
using ClayMo.Module.TenantManagement.Application.Contracts;
using ClayMo.Module.TenantManagement.Domain;

namespace ClayMo.Module.TenantManagement.Application;

[DependsOn(
    typeof(TenantManagementDomainModule),
    typeof(TenantManagementApplicationContractsModule))]
public class TenantManagementApplicationModule: AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        Configure<AbpAutoMapperOptions>(options =>
        {
            options.AddMaps<TenantManagementApplicationModule>();
        });
        
    }
}