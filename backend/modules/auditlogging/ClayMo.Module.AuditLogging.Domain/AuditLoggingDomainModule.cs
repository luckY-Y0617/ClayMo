using Volo.Abp.Domain;
using Volo.Abp.Modularity;
using ClayMo.Module.AuditLogging.Domain.Shared;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.AuditLogging.Domain;

[DependsOn(typeof(AbpDddDomainModule),
    typeof(AuditLoggingDomainSharedModule)
)]
public class AuditLoggingDomainModule: AbpModule
{
    
}