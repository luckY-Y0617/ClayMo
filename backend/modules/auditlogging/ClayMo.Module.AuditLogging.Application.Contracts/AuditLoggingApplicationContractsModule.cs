using Volo.Abp.Modularity;
using ClayMo.Module.AuditLogging.Domain.Shared;

namespace ClayMo.Module.AuditLogging.Application.Contracts;

[DependsOn(typeof(AuditLoggingDomainSharedModule))]
public class AuditLoggingApplicationContractsModule : AbpModule
{
    
}

