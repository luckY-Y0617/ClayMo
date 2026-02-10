using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Domain.Goal;
using ClayMo.Module.Workspace.Domain.Goal.Repositories;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.SqlSugar.Goal;

public class WeeklyFocusItemRepository
    : SqlSugarRepository<SqlSugarDbContext, WeeklyFocusItem, Guid>, IWeeklyFocusItemRepository,ITransientDependency
{
    public WeeklyFocusItemRepository(ISqlSugarDbContextProvider<SqlSugarDbContext> provider) : base(provider) { }

    public async Task<List<WeeklyFocusItem>> GetListAsync(Guid userId, DateTime weekStart, CancellationToken ct = default)
    {
        var ws = weekStart.Date;
        var q = await GetSugarQueryableAsync();
        return await q.Where(x => x.CreatorId == userId && x.WeekStartDate == ws)
            .OrderBy(x => x.Sort)
            .ToListAsync(ct);
    }

    public async Task<WeeklyFocusItem?> FindAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var q = await GetSugarQueryableAsync();
        return await q.Where(x => x.Id == id && x.CreatorId == userId).FirstAsync(ct);
    }
}