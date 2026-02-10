using Volo.Abp.Domain;
using Volo.Abp.Modularity;
using Volo.Abp.TenantManagement;
using ClayMo.Module.AuditLogging.Domain.Shared;
using ClayMo.Module.Identity.Domain.Shared;

namespace ClayMo.Abp.Domain.Shared;

[DependsOn(typeof(AbpDddDomainSharedModule),
    typeof(AbpTenantManagementDomainSharedModule),
    
    typeof(AuditLoggingDomainSharedModule),
    typeof(IdentityDomainSharedModule)
    )]
public class ClayMoAbpDomainSharedModule: AbpModule
{
    
}