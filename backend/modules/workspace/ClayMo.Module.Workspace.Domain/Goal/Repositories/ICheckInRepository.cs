using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.Workspace.Domain.Goal.Repositories;

public interface ICheckInRepository: ISqlSugarRepository<CheckIn, Guid>
{
    Task<List<CheckIn>> GetRangeAsync(Guid userId, DateTime start, DateTime endExclusive,
        CancellationToken ct = default);

    Task<CheckIn?> FindAsync(Guid userId, DateTime date, CancellationToken ct = default);
}