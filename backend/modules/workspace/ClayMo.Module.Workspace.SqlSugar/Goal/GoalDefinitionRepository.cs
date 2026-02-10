using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Domain.Goal;
using ClayMo.Module.Workspace.Domain.Goal.Repositories;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.SqlSugar.Goal;

public class GoalDefinitionRepository
    : SqlSugarRepository<SqlSugarDbContext, GoalDefinition, Guid>, IGoalDefinitionRepository,ITransientDependency
{
    public GoalDefinitionRepository(ISqlSugarDbContextProvider<SqlSugarDbContext> provider) : base(provider) { }

    public async Task<List<GoalDefinition>> GetActiveListAsync(Guid userId, CancellationToken ct = default)
    {
        var q = await GetSugarQueryableAsync();
        return await q.Where(x => x.UserId == userId && x.IsActive)
            .OrderBy(x => x.Sort)
            .ToListAsync(ct);
    }

    public async Task<GoalDefinition?> FindAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var q = await GetSugarQueryableAsync();
        return await q.Where(x => x.Id == id && x.UserId == userId).FirstAsync(ct);
    }
}