using System;
using ClayMo.Module.Identity.Domain.Shared.Enums;

namespace ClayMo.Module.Identity.Application.Contracts.Teams.Dtos;

public class TeamAddMemberInput
{
    public Guid UserId { get; set; }

    public TeamMemberRole Role { get; set; } = TeamMemberRole.Member;
}