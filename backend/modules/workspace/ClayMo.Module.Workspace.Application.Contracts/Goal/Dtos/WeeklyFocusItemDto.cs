using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

public class WeeklyFocusItemDto
{
    public Guid Id { get; set; }
    public DateTime WeekStartDate { get; set; }
    public string Text { get; set; } = default!;
    public int Sort { get; set; }
}