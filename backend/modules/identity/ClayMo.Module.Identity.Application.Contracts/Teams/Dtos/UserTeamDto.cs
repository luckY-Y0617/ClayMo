using System;
using ClayMo.Module.Identity.Domain.Shared.Enums;

namespace ClayMo.Module.Identity.Application.Contracts.Teams.Dtos;

public class UserTeamDto
{
    public Guid TeamId { get; set; }
    public string Name { get; set; } = null!;
    public TeamType Type { get; set; }

    public TeamMemberRole Role { get; set; }
}
