using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.AutoMapper;
using Volo.Abp.Modularity;
using ClayMo.Module.AuditLogging.Application.Contracts;
using ClayMo.Module.AuditLogging.Domain;

namespace ClayMo.Module.AuditLogging.Application;

[DependsOn(
    typeof(AbpAutoMapperModule),
    typeof(AuditLoggingApplicationContractsModule),
    typeof(AuditLoggingDomainModule))]
public class AuditLoggingApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddAutoMapperObjectMapper<AuditLoggingApplicationModule>();
        
        Configure<AbpAutoMapperOptions>(options =>
        {
            options.AddMaps<AuditLoggingApplicationModule>();
        });
    }
}

