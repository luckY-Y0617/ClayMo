using System;
using SqlSugar;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.MultiTenancy;

namespace ClayMo.Module.Workspace.Domain.Activity;

[SugarTable("ws_activity_logs")]
public class ActivityLog : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
    [SugarColumn(IsNullable = true)]
    public Guid? TenantId { get; private set; }

    /// <summary>
    /// Workspace 维度：null = personal；非 null = team workspace
    /// </summary>
    [SugarColumn(IsNullable = true)]
    public Guid? TeamId { get; private set; }

    [SugarColumn(IsNullable = true)]
    public Guid? ActorUserId { get; private set; }

    [SugarColumn(Length = 128, IsNullable = true)]
    public string? ActorUserName { get; private set; }

    [SugarColumn(Length = 128)]
    public string Action { get; private set; } = default!;

    [SugarColumn(Length = 64)]
    public string ObjectType { get; private set; } = default!;

    public Guid ObjectId { get; private set; }

    [SugarColumn(Length = 64, IsNullable = true)]
    public string? SubjectType { get; private set; }

    [SugarColumn(IsNullable = true)]
    public Guid? SubjectId { get; private set; }

    public DateTime OccurredAt { get; private set; }

    [SugarColumn(ColumnDataType = "longtext", IsNullable = true)]
    public string? DataJson { get; private set; }

    public ActivityLog() { }

    public ActivityLog(
        Guid id,
        Guid? tenantId,
        Guid? teamId,
        Guid? actorUserId,
        string? actorUserName,
        string action,
        string objectType,
        Guid objectId,
        string? subjectType,
        Guid? subjectId,
        DateTime occurredAt,
        string? dataJson = null) : base(id)
    {
        TenantId = tenantId;
        TeamId = teamId;
        ActorUserId = actorUserId;
        ActorUserName = actorUserName;
        Action = action;
        ObjectType = objectType;
        ObjectId = objectId;
        SubjectType = subjectType;
        SubjectId = subjectId;
        OccurredAt = occurredAt;
        DataJson = dataJson;
    }
}
