using ClayMo.Framework.SqlSugar;
using Volo.Abp.DependencyInjection;
namespace ClayMo.Module.Knowledge.SqlSugar;

public class KnowledgeSqlSugarDbContext : SqlSugarDbContext
{
    public KnowledgeSqlSugarDbContext(IAbpLazyServiceProvider lazyServiceProvider)
        : base(lazyServiceProvider)
    {
    }
}