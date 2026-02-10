using System;
using System.Collections.Generic;
using ClayMo.Module.Identity.Domain.Shared.Enums;
using Volo.Abp.Application.Dtos;

namespace ClayMo.Module.Identity.Application.Contracts.Teams.Dtos;

public class TeamDto : EntityDto<Guid>
{
    public Guid? TenantId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public TeamType Type { get; set; }
    
    public DateTime CreationTime { get; set; }

    public List<TeamMemberDto> Members { get; set; } = [];
}