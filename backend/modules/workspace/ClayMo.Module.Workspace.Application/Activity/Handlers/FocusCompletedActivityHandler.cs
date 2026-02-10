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

public class FocusCompletedActivityHandler
    : ILocalEventHandler<FocusCompletedActivityEvent>,
        ITransientDependency
{
    private readonly ActivityWriter _writer;
    private readonly IClock _clock;
    private readonly ICurrentTenant _currentTenant;
    private readonly ICurrentUser _currentUser;

    public FocusCompletedActivityHandler(
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

    public virtual async Task HandleEventAsync(FocusCompletedActivityEvent eventData)
    {
        var payload = JsonSerializer.Serialize(new
        {
            eventData.Title,
            eventData.PlannedSeconds,
            eventData.ActualSeconds,
            FocusMinutes = eventData.ActualSeconds / 60
        });

        var log = new ActivityLog(
            id: Guid.NewGuid(),
            tenantId: _currentTenant.Id,
            teamId: eventData.TeamId,
            actorUserId: _currentUser.Id,
            actorUserName: _currentUser.UserName,
            action: WorkspaceActivityActionNames.Focus.Completed,
            objectType: "focus",
            objectId: eventData.SessionId,
            subjectType: null,
            subjectId: null,
            occurredAt: _clock.Now,
            dataJson: payload
        );

        await _writer.WriteAsync(log);
    }
}

