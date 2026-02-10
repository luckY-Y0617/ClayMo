using System;

namespace ClayMo.Module.Workspace.Domain.Shared.Activity.Events;

/// <summary>
/// 评论创建事件
/// </summary>
public sealed record CommentCreatedActivityEvent(
    Guid CommentId,
    Guid DocumentId,
    Guid KnowledgeBaseId,
    string? DocTitle,
    string Content,
    bool IsReply,
    Guid? TeamId
);

