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

public class KnowledgeBaseCreatedActivityHandler
    : ILocalEventHandler<KnowledgeBaseCreatedActivityEvent>,
        ITransientDependency
{
    private readonly ActivityWriter _writer;
    private readonly IClock _clock;
    private readonly ICurrentTenant _currentTenant;
    private readonly ICurrentUser _currentUser;

    public KnowledgeBaseCreatedActivityHandler(
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

    public virtual async Task HandleEventAsync(KnowledgeBaseCreatedActivityEvent eventData)
    {
        var payload = JsonSerializer.Serialize(new
        {
            eventData.Name,
            eventData.Description
        });

        var log = new ActivityLog(
            id: Guid.NewGuid(),
            tenantId: _currentTenant.Id,
            teamId: eventData.TeamId,
            actorUserId: _currentUser.Id,
            actorUserName: _currentUser.UserName,
            action: WorkspaceActivityActionNames.KnowledgeBase.Created,
            objectType: "kb",
            objectId: eventData.KnowledgeBaseId,
            subjectType: null,
            subjectId: null,
            occurredAt: _clock.Now,
            dataJson: payload
        );

        await _writer.WriteAsync(log);
    }
}

