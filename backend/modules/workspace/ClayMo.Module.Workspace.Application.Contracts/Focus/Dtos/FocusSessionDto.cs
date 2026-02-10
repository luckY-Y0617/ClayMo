using System;

namespace ClayMo.Module.Workspace.Application.Contracts.Focus.Dtos;

public class FocusSessionDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = default!;
    public int PlannedSeconds { get; set; }
    public int ActualSeconds { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime? EndAt { get; set; }
    public string? Title { get; set; }

    // running 段开始时间：用于刷新恢复倒计时
    public DateTime? RunningSegmentStartAt { get; set; }
}
