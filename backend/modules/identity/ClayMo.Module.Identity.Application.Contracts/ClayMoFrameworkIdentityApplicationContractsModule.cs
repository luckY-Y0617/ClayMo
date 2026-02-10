using ClayMo.Module.Identity.Domain.Shared;
using Volo.Abp.Modularity;

namespace ClayMo.Module.Identity.Application.Contracts;

[DependsOn(typeof(IdentityDomainSharedModule))]
public class ClayMoFrameworkIdentityApplicationContractsModule : AbpModule
{
}

