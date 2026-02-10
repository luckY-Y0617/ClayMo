using System;
using System.Collections.Generic;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class WeekCheckInDto
{
    public DateTime WeekStart { get; set; }
    public List<WeekDayDto> Days { get; set; } = new();
    public int WeekCount { get; set; }
    public int StreakCount { get; set; }

    public class WeekDayDto
    {
        public DateTime Date { get; set; }
        public bool Checked { get; set; }
    }
}