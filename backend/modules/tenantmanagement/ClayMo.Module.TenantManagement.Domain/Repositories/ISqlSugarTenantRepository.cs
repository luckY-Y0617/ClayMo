using System;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.TenantManagement.Domain.Repositories;

public interface ISqlSugarTenantRepository : ISqlSugarRepository<TenantAggregateRoot, Guid>
{
    public Task InsertWithConnStrAsync(TenantAggregateRoot tenantAggregateRoot);
    
    public Task<bool> IsDuplicatedAsync(string name);
}