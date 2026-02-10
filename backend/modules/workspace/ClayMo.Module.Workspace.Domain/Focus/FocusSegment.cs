using System;
using SqlSugar;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.MultiTenancy;

namespace ClayMo.Module.Workspace.Domain.Focus;

[SugarTable("ws_focus_segments")]
[SugarIndex("idx_ws_focus_seg_tenant_session", nameof(TenantId), OrderByType.Asc, nameof(SessionId), OrderByType.Asc, nameof(StartAt), OrderByType.Asc)]
public class FocusSegment : FullAuditedEntity<Guid>, IMultiTenant, IHasConcurrencyStamp
{
    [SugarColumn(IsNullable = true)]
    public Guid? TenantId { get; private set; }

    public Guid SessionId { get; private set; }

    public DateTime StartAt { get; private set; }

    [SugarColumn(IsNullable = true)]
    public DateTime? EndAt { get; private set; } // null = running

    public int DurationSeconds { get; private set; } // 冗余存储（结束时写）
    
    [SugarColumn(IsNullable = false)]
    public string ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();

    public FocusSegment() { }

    public FocusSegment(Guid id, Guid? tenantId, Guid sessionId, DateTime startAt) : base(id)
    {
        TenantId = tenantId;
        SessionId = sessionId;
        StartAt = startAt;
        EndAt = null;
        DurationSeconds = 0;
    }

    public int Finish(DateTime endAt)
    {
        if (EndAt.HasValue) return DurationSeconds; // 幂等
        EndAt = endAt;

        var seconds = (int)Math.Max(0, (EndAt.Value - StartAt).TotalSeconds);
        DurationSeconds = seconds;
        return seconds;
    }
}