using Volo.Abp.Domain;
using Volo.Abp.Modularity;

namespace ClayMo.Module.Knowledge.Domain.Shared;


[DependsOn(typeof(AbpDddDomainSharedModule))]
public class KnowledgeDomainSharedModule: AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {

    }
}