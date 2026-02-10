using System;
using ClayMo.Module.Workspace.Domain.Activity;
using ClayMo.Module.Workspace.Domain.Shared.Activity;
using ClayMo.Module.Workspace.Domain.Shared.Activity.Events;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EventBus;
using Volo.Abp.MultiTenancy;
using Volo.Abp.Timing;
using Volo.Abp.Users;
using System.Text.Json;
using System.Threading.Tasks;

namespace ClayMo.Module.Workspace.Application.Activity.Handlers;

public class CommentCreatedActivityHandler
    : ILocalEventHandler<CommentCreatedActivityEvent>,
        ITransientDependency
{
    private readonly ActivityWriter _writer;
    private readonly IClock _clock;
    private readonly ICurrentTenant _currentTenant;
    private readonly ICurrentUser _currentUser;

    public CommentCreatedActivityHandler(
        ActivityWriter writer,
        IClock clock,
        ICurrentTenant currentTenant,
        ICurrentUser currentUser)
    {
        _writer = writer;
        _clock = clock;
        _currentTenant = currentTenant;
        _currentUser = currentUser;
    }

    public virtual async Task HandleEventAsync(CommentCreatedActivityEvent eventData)
    {
        var payload = JsonSerializer.Serialize(new
        {
            eventData.DocTitle,
            eventData.Content,
            eventData.DocumentId,
            eventData.KnowledgeBaseId
        });

        // 根据是否是回复选择不同的 action
        var action = eventData.IsReply
            ? WorkspaceActivityActionNames.Comment.Replied
            : WorkspaceActivityActionNames.Comment.Created;

        var log = new ActivityLog(
            id: Guid.NewGuid(),
            tenantId: _currentTenant.Id,
            teamId: eventData.TeamId,
            actorUserId: _currentUser.Id,
            actorUserName: _currentUser.UserName,
            action: action,
            objectType: "comment",
            objectId: eventData.CommentId,
            subjectType: "doc",
            subjectId: eventData.DocumentId,
            occurredAt: _clock.Now,
            dataJson: payload
        );

        await _writer.WriteAsync(log);
    }
}

