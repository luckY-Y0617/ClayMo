using System;
using System.Collections.Generic;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class DashboardTodayDto
{
    public DateTime Date { get; set; }

    public List<DashboardGoalItemDto> Goals { get; set; } = new();

    public DashboardGoalSummaryDto GoalsSummary { get; set; } = new();

    public List<DashboardWeeklyFocusItemDto> WeeklyFocus { get; set; } = new();

    public DashboardWeekCheckInDto WeekCheckIn { get; set; } = new();
}