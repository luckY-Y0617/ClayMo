using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class DashboardGoalItemDto
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Mode { get; set; } = string.Empty;

    public int TargetCount { get; set; }

    public int DoneCount { get; set; }

    public bool IsChecked { get; set; }
}