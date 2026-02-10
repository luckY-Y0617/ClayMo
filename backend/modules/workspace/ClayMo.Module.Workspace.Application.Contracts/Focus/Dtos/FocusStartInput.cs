using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Focus.Dtos;

public class FocusStartInput
{
    public Guid Id { get; set; }               // sessionId (前端生成)
    public int PlannedSeconds { get; set; }    // 1500
    public string? Title { get; set; }
}