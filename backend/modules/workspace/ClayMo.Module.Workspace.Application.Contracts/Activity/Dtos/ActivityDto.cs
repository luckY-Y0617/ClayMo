using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Activity.Dtos;

public class ActivityDto
{
    public Guid Id { get; set; }
    public string? TeamId { get; set; }

    public Guid? ActorUserId { get; set; }
    public string? ActorUserName { get; set; }

    public string Action { get; set; } = default!;
    public string ObjectType { get; set; } = default!;
    public Guid ObjectId { get; set; }

    public string? SubjectType { get; set; }
    public Guid? SubjectId { get; set; }

    public DateTime OccurredAt { get; set; }
    public string? DataJson { get; set; }
}