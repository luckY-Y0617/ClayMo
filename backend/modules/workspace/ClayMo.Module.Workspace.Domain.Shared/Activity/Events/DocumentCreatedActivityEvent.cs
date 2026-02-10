using System;

namespace ClayMo.Module.Workspace.Domain.Shared.Activity.Events;

public sealed record DocumentCreatedActivityEvent(
    Guid DocumentId,
    Guid KnowledgeBaseId,
    Guid? ParentId,
    string Title,
    int Order,
    Guid? TeamId // null = personal
);