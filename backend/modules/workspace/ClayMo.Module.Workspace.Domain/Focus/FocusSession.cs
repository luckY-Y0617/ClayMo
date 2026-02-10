using System;
using ClayMo.Module.Workspace.Domain.Shared.Focus;
using SqlSugar;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.MultiTenancy;

namespace ClayMo.Module.Workspace.Domain.Focus;

[SugarTable("ws_focus_sessions")]
[SugarIndex("idx_ws_focus_tenant_user_status", nameof(TenantId), OrderByType.Asc, nameof(UserId), OrderByType.Asc, nameof(Status), OrderByType.Asc)]
public class FocusSession : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
    [SugarColumn(IsNullable = true)]
    public Guid? TenantId { get; private set; }

    public Guid UserId { get; private set; }

    public FocusSessionStatus Status { get; private set; }

    public int PlannedSeconds { get; private set; }

    public int ActualSeconds { get; private set; }

    public DateTime StartAt { get; private set; }

    [SugarColumn(IsNullable = true)]
    public DateTime? EndAt { get; private set; }

    [SugarColumn(Length = 256, IsNullable = true)]
    public string? Title { get; private set; }

    public FocusSession() { }

    public FocusSession(
        Guid id,
        Guid? tenantId,
        Guid userId,
        int plannedSeconds,
        DateTime startAt,
        string? title = null) : base(id)
    {
        TenantId = tenantId;
        UserId = userId;
        PlannedSeconds = plannedSeconds;
        StartAt = startAt;
        Title = title;

        Status = FocusSessionStatus.Running;
        ActualSeconds = 0;
    }

    public void MarkPaused() => Status = FocusSessionStatus.Paused;

    public void MarkRunning() => Status = FocusSessionStatus.Running;

    public void AddActualSeconds(int seconds)
    {
        if (seconds > 0) ActualSeconds += seconds;
    }

    public void MarkCompleted(DateTime endAt)
    {
        Status = FocusSessionStatus.Completed;
        EndAt = endAt;
    }

    public void MarkCanceled(DateTime endAt)
    {
        Status = FocusSessionStatus.Canceled;
        EndAt = endAt;
    }
}
