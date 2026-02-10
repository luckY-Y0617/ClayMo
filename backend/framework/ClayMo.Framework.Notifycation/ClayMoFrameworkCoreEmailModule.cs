using ClayMo.Framework.Core.Sms.Options;
using ClayMo.Framework.Notifycation.Options;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;

namespace ClayMo.Framework.Notifycation;

public class ClayMoFrameworkCoreEmailModule: AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddHttpClient();
        context.Services.Configure<SendCloudOptions>(context.Services.GetConfiguration().GetSection("SendCloudOptions"));
        
        var configuration = context.Services.GetConfiguration();
        context.Services.Configure<AliyunOptions>(configuration.GetSection("AliyunOptions"));
    }
}