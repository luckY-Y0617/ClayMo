using System;
using SqlSugar;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.MultiTenancy;
using ClayMo.Module.Workspace.Domain.Shared.Goal.Enums;

namespace ClayMo.Module.Workspace.Domain.Goal;

[SugarTable("ws_goal_definitions")]
[SugarIndex("idx_ws_goal_def_user_active_sort", nameof(TenantId), OrderByType.Asc, nameof(UserId), OrderByType.Asc, nameof(IsActive), OrderByType.Asc, nameof(Sort), OrderByType.Asc)]
public class GoalDefinition : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
    [SugarColumn(IsNullable = true)]
    public Guid? TenantId { get; private set; }

    public Guid UserId { get; private set; }

    [SugarColumn(Length = 256)]
    public string Title { get; private set; } = null!;

    public GoalMode Mode { get; private set; }

    public int TargetCount { get; private set; }

    public int Sort { get; private set; }

    public bool IsActive { get; private set; }

    public GoalDefinition() { }

    public GoalDefinition(Guid userId, string title, GoalMode mode, int targetCount, int sort, bool isActive = true)
    {
        UserId = userId;
        SetTitle(title);
        SetMode(mode, targetCount);
        Sort = sort;
        IsActive = isActive;
    }

    public void SetTitle(string title)
    {
        Title = title?.Trim() ?? throw new ArgumentNullException(nameof(title));
        if (Title.Length == 0) throw new ArgumentException("Title is empty.", nameof(title));
    }

    public void SetMode(GoalMode mode, int targetCount)
    {
        Mode = mode;
        TargetCount = mode == GoalMode.Checkbox ? 1 : Math.Max(1, targetCount);
    }

    public void SetSort(int sort) => Sort = sort;

    public void SetActive(bool isActive) => IsActive = isActive;
}