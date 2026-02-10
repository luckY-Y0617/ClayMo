using System;

namespace ClayMo.Module.Identity.Application.Contracts.Teams.Dtos;

public class TeamRemoveMemberInput
{
    public Guid TeamId { get; set; }

    public Guid UserId { get; set; }
}