using System;
using ClayMo.Module.Identity.Domain.Shared.Enums;

namespace ClayMo.Module.Identity.Application.Contracts.Teams.Dtos;

public class TeamChangeMemberRoleInput
{
    public Guid TeamId { get; set; }

    public Guid UserId { get; set; }

    public TeamMemberRole Role { get; set; }
}