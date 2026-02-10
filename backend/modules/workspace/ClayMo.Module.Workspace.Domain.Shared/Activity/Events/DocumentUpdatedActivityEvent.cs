using System;

namespace ClayMo.Module.Workspace.Domain.Shared.Activity.Events;

/// <summary>
/// 文档内容更新事件（仅手动保存时触发）
/// </summary>
public sealed record DocumentUpdatedActivityEvent(
    Guid DocumentId,
    Guid KnowledgeBaseId,
    string Title,
    string? ChangeSummary,
    Guid? TeamId
);

