using SqlSugar;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.MultiTenancy;

namespace ClayMo.Module.Workspace.Domain.Goal;

[SugarTable("ws_week_focus_items")]
[SugarIndex("idx_ws_focus_user_week_sort",
    nameof(TenantId), OrderByType.Asc,
    nameof(WeekStartDate), OrderByType.Asc,
    nameof(Sort), OrderByType.Asc)]
public class WeeklyFocusItem : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
    [SugarColumn(IsNullable = true)]
    public Guid? TenantId { get; private set; }

    public DateTime WeekStartDate { get; private set; }

    [SugarColumn(Length = 256)]
    public string Text { get; private set; } = default!;

    public int Sort { get; private set; }

    public WeeklyFocusItem() { }

    public WeeklyFocusItem(DateTime weekStartDate, string text, int sort)
    {
        WeekStartDate = weekStartDate.Date;
        SetText(text);
        Sort = sort;
    }

    public void SetText(string text)
    {
        Text = text.Trim() ?? throw new ArgumentNullException(nameof(text));
        if (Text.Length == 0) throw new ArgumentException("Text is empty.", nameof(text));
    }

    public void SetSort(int sort) => Sort = sort;
}