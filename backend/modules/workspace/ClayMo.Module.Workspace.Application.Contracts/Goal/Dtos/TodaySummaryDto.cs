using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class TodaySummaryDto
{
    public DateTime Date { get; set; }
    public int TotalGoals { get; set; }
    public int CompletedGoals { get; set; }
    public double ProgressRatio { get; set; }
}