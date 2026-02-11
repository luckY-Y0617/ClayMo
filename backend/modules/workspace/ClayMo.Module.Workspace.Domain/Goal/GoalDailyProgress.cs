using SqlSugar;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.MultiTenancy;

namespace ClayMo.Module.Workspace.Domain.Goal;

[SugarTable("ws_goal_daily_progress")]
[SugarIndex("idx_ws_goal_prog_user_date", nameof(TenantId), OrderByType.Asc,nameof(Date), OrderByType.Asc)]
[SugarIndex("uq_ws_goal_prog_goal_date", nameof(TenantId), OrderByType.Asc,  nameof(GoalId), OrderByType.Asc, nameof(Date), OrderByType.Asc,
    isUnique: true)]
public class GoalDailyProgress : FullAuditedEntity<Guid>, IMultiTenant, IHasConcurrencyStamp
{
    [SugarColumn(IsNullable = true)]
    public Guid? TenantId { get; private set; }

    public Guid GoalId { get; private set; }

    /// <summary>
    /// 仅日期（建议存 DateTime.Date）
    /// </summary>
    public DateTime Date { get; private set; }

    public int DoneCount { get; private set; }

    public bool IsChecked { get; private set; }

    [SugarColumn(IsNullable = false)]
    public string ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();
    
    public GoalDailyProgress() { }

    public GoalDailyProgress(Guid goalId, DateTime date)
    {
        GoalId = goalId;
        Date = date.Date;
        DoneCount = 0;
        IsChecked = false;
    }

    public void SetChecked(bool isChecked)
    {
        IsChecked = isChecked;
        if (isChecked) DoneCount = Math.Max(DoneCount, 1);
        else DoneCount = 0;
    }

    public void Increment(int targetCount)
    {
        DoneCount = Math.Min(DoneCount + 1, Math.Max(1, targetCount));
        IsChecked = DoneCount >= 1;
    }

    public void Decrement()
    {
        DoneCount = Math.Max(0, DoneCount - 1);
        IsChecked = DoneCount >= 1;
    }
}