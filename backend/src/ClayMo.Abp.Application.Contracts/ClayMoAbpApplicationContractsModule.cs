using Volo.Abp.Modularity;
using ClayMo.Abp.Domain.Shared;
using ClayMo.Module.TenantManagement.Application.Contracts;

namespace ClayMo.Abp.Application.Contracts;

[DependsOn(
    typeof(ClayMoAbpDomainSharedModule)
    )]
public class ClayMoAbpApplicationContractsModule: AbpModule
{
    
}