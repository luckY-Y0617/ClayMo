using System;

namespace ClayMo.Module.Workspace.Domain.Shared.Activity.Events;

/// <summary>
/// 文档删除事件
/// </summary>
public sealed record DocumentDeletedActivityEvent(
    Guid DocumentId,
    Guid KnowledgeBaseId,
    string Title,
    Guid? TeamId
);

