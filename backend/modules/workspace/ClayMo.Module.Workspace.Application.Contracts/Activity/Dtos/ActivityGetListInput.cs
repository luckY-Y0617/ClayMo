using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Activity.Dtos;

public class ActivityGetListInput
{
    public string? TeamId { get; set; } // null/empty = personal
    public string? ObjectType { get; set; } // "doc" / "kb" ...
    public Guid? ObjectId { get; set; }
    public string? SubjectType { get; set; } // "kb" ...
    public Guid? SubjectId { get; set; }

    public int SkipCount { get; set; } = 0;
    public int MaxResultCount { get; set; } = 50;
}