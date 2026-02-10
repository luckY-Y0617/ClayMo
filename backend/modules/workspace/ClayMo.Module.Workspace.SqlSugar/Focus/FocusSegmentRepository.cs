using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Domain.Focus;
using SqlSugar;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.SqlSugar.Focus;

public class FocusSegmentRepository
    : SqlSugarRepository<SqlSugarDbContext, FocusSegment, Guid>,
        IFocusSegmentRepository, ITransientDependency
{
    public FocusSegmentRepository(ISqlSugarDbContextProvider<SqlSugarDbContext> provider)
        : base(provider)
    {
    }

    public async Task<FocusSegment?> FindRunningSegmentAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await (await GetSugarQueryableAsync())
            .Where(x => x.SessionId == sessionId && x.EndAt == null)
            .OrderBy(x => x.StartAt, OrderByType.Desc)
            .FirstAsync(ct);
    }

    public async Task<int> SumDurationSecondsAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await (await GetSugarQueryableAsync())
            .Where(x => x.SessionId == sessionId && x.EndAt != null)
            .SumAsync(x => x.DurationSeconds);
    }
}