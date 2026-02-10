using Volo.Abp.Domain;
using Volo.Abp.Modularity;
using ClayMo.Abp.Domain.Shared;
using ClayMo.Module.AuditLogging.Domain;
using ClayMo.Module.TenantManagement.Domain;

namespace ClayMo.Abp.Domain;

[DependsOn(typeof(AbpDddDomainModule),
    
    typeof(ClayMoAbpDomainSharedModule),
    typeof(TenantManagementDomainModule),
    typeof(AuditLoggingDomainModule)
    )]
public class ClayMoAbpDomainModule: AbpModule
{
    
}