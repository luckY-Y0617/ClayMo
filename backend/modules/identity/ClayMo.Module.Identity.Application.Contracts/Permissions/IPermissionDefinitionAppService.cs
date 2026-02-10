using System.Collections.Generic;
using System.Threading.Tasks;
using ClayMo.Module.Identity.Application.Contracts.Permissions.Dtos;
using Volo.Abp.Application.Services;

namespace ClayMo.Module.Identity.Application.Contracts.Permissions;

public interface IPermissionDefinitionAppService : IApplicationService
{
    Task<List<PermissionModuleDto>> GetModulesAsync();
}

