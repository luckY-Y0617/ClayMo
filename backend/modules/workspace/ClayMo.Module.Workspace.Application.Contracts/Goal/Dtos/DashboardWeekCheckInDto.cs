using System;
using System.Collections.Generic;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class DashboardWeekCheckInDto
{
    public DateTime WeekStart { get; set; }

    public List<DashboardDayCheckInDto> Days { get; set; } = new();

    public int WeekCount { get; set; }

    public int StreakCount { get; set; }
}

public class DashboardDayCheckInDto
{
    public DateTime Date { get; set; }

    public bool Checked { get; set; }
}