using System;
using System.Threading.Tasks;
using ClayMo.Module.Identity.Application.Contracts.identities.Dtos;
using Volo.Abp.Application.Services;

namespace ClayMo.Module.Identity.Application.Contracts.identities;

public interface IIdentityAuthAppService : IApplicationService
{
    Task<SessionLoginOutputDto> LoginAsync(LoginInputDto input);
    Task<LoginOutputDto> RefreshTokenAsync(RefreshTokenInputDto input);
    Task LogoutAsync(Guid userId);
}


