using Volo.Abp.Application;
using Volo.Abp.Modularity;

namespace ClayMo.Module.TenantManagement.Application.Contracts;

[DependsOn(typeof(AbpDddApplicationContractsModule))]
public class TenantManagementApplicationContractsModule: AbpModule
{
}