using System;

namespace ClayMo.Module.Workspace.Domain.Shared.Activity.Events;

/// <summary>
/// 知识库创建事件
/// </summary>
public sealed record KnowledgeBaseCreatedActivityEvent(
    Guid KnowledgeBaseId,
    string Name,
    string? Description,
    Guid? TeamId
);

