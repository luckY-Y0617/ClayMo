namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class CreateWeeklyFocusItemInput
{
    public string Text { get; set; } = default!;
    public int Sort { get; set; } = 0;
}