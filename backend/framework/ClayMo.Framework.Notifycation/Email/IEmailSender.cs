using Volo.Abp.DependencyInjection;

namespace ClayMo.Framework.Notifycation.Email;

public interface IEmailSender: ITransientDependency
{
    public Task SendAsync(string to, string subject, string body);
}