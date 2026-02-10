using System;
using ClayMo.Module.Workspace.Domain.Shared.Goal.Enums;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class GoalDefinitionDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = default!;
    public GoalMode Mode { get; set; }
    public int TargetCount { get; set; }
    public int Sort { get; set; }
    public bool IsActive { get; set; }
}