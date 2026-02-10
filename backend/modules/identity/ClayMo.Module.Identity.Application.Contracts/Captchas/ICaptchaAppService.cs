using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Identity.Application.Contracts.Captchas.Dtos;
using Volo.Abp.Application.Services;

namespace ClayMo.Module.Identity.Application.Contracts.Captchas;

public interface ICaptchaAppService : IApplicationService
{
    Task<CaptchaOutputDto> GetImageCaptchaAsync(CancellationToken cancellationToken = default);
}