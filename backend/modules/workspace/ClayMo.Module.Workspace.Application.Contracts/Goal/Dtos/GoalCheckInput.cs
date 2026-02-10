using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class GoalCheckInput
{
    public bool IsChecked { get; set; }
    public DateTime? Date { get; set; }
}