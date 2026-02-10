using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Framework.Notifycation;

public interface IEmailSender: ITransientDependency
{
    public Task SendAsync(string to, string subject, string body);
}