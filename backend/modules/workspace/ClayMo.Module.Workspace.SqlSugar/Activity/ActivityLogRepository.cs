using ClayMo.Framework.SqlSugar;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Domain.Activity;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.SqlSugar.Activity;

public class ActivityLogRepository
    : SqlSugarRepository<SqlSugarDbContext, ActivityLog, Guid>,
        IActivityLogRepository, ITransientDependency
{
    public ActivityLogRepository(
        ISqlSugarDbContextProvider<SqlSugarDbContext> provider)
        : base(provider)
    {
    }
}