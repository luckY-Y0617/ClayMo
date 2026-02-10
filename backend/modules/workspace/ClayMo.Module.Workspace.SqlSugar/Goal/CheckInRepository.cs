using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Domain.Goal;
using ClayMo.Module.Workspace.Domain.Goal.Repositories;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.SqlSugar.Goal;

public class CheckInRepository
    : SqlSugarRepository<SqlSugarDbContext, CheckIn, Guid>, ICheckInRepository, ITransientDependency
{
    public CheckInRepository(ISqlSugarDbContextProvider<SqlSugarDbContext> provider) : base(provider) { }

    public async Task<CheckIn?> FindAsync(Guid userId, DateTime date, CancellationToken ct = default)
    {
        var d = date.Date;
        var q = await GetSugarQueryableAsync();
        return await q.Where(x => x.CreatorId == userId && x.CreationTime == d).FirstAsync(ct);
    }

    public async Task<List<CheckIn>> GetRangeAsync(Guid userId, DateTime start, DateTime endExclusive, CancellationToken ct = default)
    {
        var s = start.Date;
        var e = endExclusive.Date;
        var q = await GetSugarQueryableAsync();
        return await q.Where(x => x.CreatorId == userId && x.CreationTime >= s && x.CreationTime < e)
            .OrderBy(x => x.CreationTime)
            .ToListAsync(ct);
    }
}