using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class DashboardWeeklyFocusItemDto
{
    public Guid Id { get; set; }

    public string Text { get; set; } = string.Empty;
}