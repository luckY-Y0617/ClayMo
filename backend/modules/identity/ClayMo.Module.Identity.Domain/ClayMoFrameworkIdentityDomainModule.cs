using ClayMo.Module.Identity.Domain.Shared;
using ClayMo.Framework.SqlSugar.Abstractions;
using Volo.Abp.Domain;
using Volo.Abp.Modularity;

namespace ClayMo.Module.Identity.Domain;

[DependsOn(
    typeof(AbpDddDomainModule),
    typeof(IdentityDomainSharedModule))]
public class ClayMoFrameworkIdentityDomainModule : AbpModule
{
}

