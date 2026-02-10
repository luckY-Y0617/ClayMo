using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.Workspace.Domain.Goal.Repositories;

public interface IWeeklyFocusItemRepository: ISqlSugarRepository<WeeklyFocusItem, Guid>
{
    Task<WeeklyFocusItem?> FindAsync(Guid id, Guid userId, CancellationToken ct = default);

    Task<List<WeeklyFocusItem>> GetListAsync(Guid userId, DateTime weekStart, CancellationToken ct = default);
}