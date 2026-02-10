using ClayMo.Module.Workspace.Domain.Shared.Goal.Enums;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class CreateGoalDefinitionInput
{
    public string Title { get; set; } = default!;
    public GoalMode Mode { get; set; } = GoalMode.Checkbox;
    public int TargetCount { get; set; } = 1;
    public int Sort { get; set; } = 0;
}
