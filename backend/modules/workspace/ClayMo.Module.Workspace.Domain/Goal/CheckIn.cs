using SqlSugar;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.MultiTenancy;

namespace ClayMo.Module.Workspace.Domain.Goal;

[SugarTable("ws_checkins")]
[SugarIndex("uq_ws_checkin_user_date", nameof(TenantId), OrderByType.Asc, isUnique: true)]
[SugarIndex("idx_ws_checkin_user_date", nameof(TenantId), OrderByType.Asc)]
public class CheckIn : FullAuditedEntity<Guid>, IMultiTenant, IHasConcurrencyStamp
{
    [SugarColumn(IsNullable = true)]
    public Guid? TenantId { get; private set; }
    
    /// <summary>
    /// 打卡来源
    /// </summary>
    [SugarColumn(Length = 32)]
    public string Source { get; private set; } = null!; // manual/goal/focus
    
    [SugarColumn(IsNullable = false)]
    public string ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();

    public CheckIn() { }

    public CheckIn(string source)
    {
        Source = string.IsNullOrWhiteSpace(source) ? "manual" : source.Trim();
    }
}