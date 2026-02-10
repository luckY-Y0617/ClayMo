using System;
using System.Collections.Generic;
using ClayMo.Module.Identity.Domain.Shared.Enums;
using Volo.Abp.Application.Dtos;

namespace ClayMo.Module.Identity.Application.Contracts.Roles.Dtos;

public class RoleDto : EntityDto<Guid>
{
    public string RoleName { get; set; } = string.Empty;
    public string RoleCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public RoleTypeEnum RoleType { get; set; } = RoleTypeEnum.Custom;
    public bool IsEnabled { get; set; }
    public int OrderNum { get; set; }
    public Guid? TenantId { get; set; }
    public List<string> PermissionCodes { get; set; } = new();
    public string CreationTime { get; set; } = string.Empty;
}


