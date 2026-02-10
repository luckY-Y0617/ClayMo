using Volo.Abp.Domain;
using Volo.Abp.Modularity;

namespace ClayMo.Module.AuditLogging.Domain.Shared;

[DependsOn(typeof(AbpDddDomainSharedModule))]
public class AuditLoggingDomainSharedModule: AbpModule
{
    
}