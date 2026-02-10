using System;
using ClayMo.Module.Workspace.Domain.Shared.Goal.Enums;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class GoalProgressItemDto
{
    public Guid GoalId { get; set; }
    public string Title { get; set; } = default!;
    public GoalMode Mode { get; set; }
    public int TargetCount { get; set; }
    public int Sort { get; set; }
    public int DoneCount { get; set; }
    public bool IsChecked { get; set; }
}