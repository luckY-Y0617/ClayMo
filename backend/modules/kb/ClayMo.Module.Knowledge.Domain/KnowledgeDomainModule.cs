using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Knowledge.Domain.Shared;
using Volo.Abp.Domain;
using Volo.Abp.Modularity;

namespace ClayMo.Module.Knowledge.Domain;

[DependsOn(typeof(AbpDddDomainModule),
    typeof(KnowledgeDomainSharedModule))]
public class KnowledgeDomainModule: AbpModule
{
    
}