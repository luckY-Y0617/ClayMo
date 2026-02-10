using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Domain.Focus;
using ClayMo.Module.Workspace.Domain.Shared.Focus;
using SqlSugar;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.SqlSugar.Focus;

public class FocusSessionRepository
    : SqlSugarRepository<SqlSugarDbContext, FocusSession, Guid>,
        IFocusSessionRepository, ITransientDependency
{
    public FocusSessionRepository(ISqlSugarDbContextProvider<SqlSugarDbContext> provider)
        : base(provider)
    {
    }

    public async Task<FocusSession?> FindAsync(Guid id, CancellationToken ct = default)
    {
        return await (await GetSugarQueryableAsync())
            .Where(x => x.Id == id)
            .FirstAsync(ct);
    }


    public async Task<FocusSession?> FindCurrentAsync(Guid userId, CancellationToken ct = default)
    {
        return await (await GetSugarQueryableAsync())
            .Where(x => x.Status == FocusSessionStatus.Running || x.Status == FocusSessionStatus.Paused)
            .OrderBy(x => x.StartAt, OrderByType.Desc)
            .FirstAsync(ct);
    }
}