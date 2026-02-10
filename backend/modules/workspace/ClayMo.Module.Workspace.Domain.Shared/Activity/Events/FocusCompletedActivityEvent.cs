using System;

namespace ClayMo.Module.Workspace.Domain.Shared.Activity.Events;

/// <summary>
/// 专注完成事件
/// </summary>
public sealed record FocusCompletedActivityEvent(
    Guid SessionId,
    string? Title,
    int PlannedSeconds,
    int ActualSeconds,
    Guid? TeamId
);

