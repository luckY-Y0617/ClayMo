using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Domain.Goal;
using ClayMo.Module.Workspace.Domain.Goal.Repositories;
using SqlSugar;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.SqlSugar.Goal;

public class GoalDailyProgressRepository
    : SqlSugarRepository<SqlSugarDbContext, GoalDailyProgress, Guid>, IGoalDailyProgressRepository,ITransientDependency
{
    public GoalDailyProgressRepository(ISqlSugarDbContextProvider<SqlSugarDbContext> provider) : base(provider) { }

    public async Task<GoalDailyProgress?> FindAsync(Guid userId, Guid goalId, DateTime date, CancellationToken ct = default)
    {
        var d = date.Date;
        var q = await GetSugarQueryableAsync();
        return await q.Where(x => x.CreatorId == userId && x.GoalId == goalId && x.Date == d).FirstAsync(ct);
    }

    public async Task<List<GoalDailyProgress>> GetByDateAsync(Guid userId, DateTime date, CancellationToken ct = default)
    {
        var d = date.Date;
        var q = await GetSugarQueryableAsync();
        return await q.Where(x => x.CreatorId == userId && x.Date == d).ToListAsync(ct);
    }
}