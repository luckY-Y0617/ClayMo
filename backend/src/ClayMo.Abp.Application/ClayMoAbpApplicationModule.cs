using Volo.Abp.Modularity;
using ClayMo.Abp.Application.Contracts;
using ClayMo.Abp.Application.Worker;
using ClayMo.Abp.Domain;
using ClayMo.Module.AuditLogging.Application;
using ClayMo.Module.Identity.Application;
using ClayMo.Module.TenantManagement.Application;
using ClayMo.Module.Knowledge.Application;
using ClayMo.Module.Workspace.Application;
using Microsoft.Extensions.DependencyInjection;

namespace ClayMo.Abp.Application;

[DependsOn(typeof(ClayMoAbpApplicationContractsModule),
    typeof(ClayMoAbpDomainModule),
    
    typeof(TenantManagementApplicationModule),
    typeof(AuditLoggingApplicationModule),
    typeof(IdentityApplicationModule),
    typeof(KnowledgeApplicationModule),
    typeof(WorkSpaceApplicationModule)
    )]
public class ClayMoAbpApplicationModule: AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddHostedService<TenantProvisioningWorker>();

    }
}