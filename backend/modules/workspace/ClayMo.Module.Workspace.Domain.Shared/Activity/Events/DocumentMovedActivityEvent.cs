using System;

namespace ClayMo.Module.Workspace.Domain.Shared.Activity.Events;

public sealed record DocumentMovedActivityEvent(
    Guid DocumentId,
    Guid KnowledgeBaseId,
    Guid? FromParentId,
    Guid? ToParentId,
    int ToOrder,
    Guid? TeamId
);
