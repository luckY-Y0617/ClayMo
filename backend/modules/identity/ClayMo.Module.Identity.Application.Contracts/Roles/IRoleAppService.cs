using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClayMo.Module.Identity.Application.Contracts.Roles.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace ClayMo.Module.Identity.Application.Contracts.Roles;

public interface IRoleAppService : IApplicationService
{
    Task<RoleDto> CreateAsync(RoleCreateDto input);

    Task<RoleDto> UpdateAsync(Guid id, RoleUpdateDto input);

    Task DeleteAsync(Guid id);

    Task<RoleDto> GetAsync(Guid id);

    Task<PagedResultDto<RoleDto>> GetListAsync(RoleGetListInputDto input);

    Task<List<string>> GetPermissionCodesAsync(Guid id);

    Task AssignPermissionsAsync(Guid id, AssignPermissionsDto input);
}