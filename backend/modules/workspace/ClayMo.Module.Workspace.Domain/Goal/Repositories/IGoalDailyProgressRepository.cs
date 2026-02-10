using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.Workspace.Domain.Goal.Repositories;

public interface IGoalDailyProgressRepository: ISqlSugarRepository<GoalDailyProgress, Guid>
{
    Task<GoalDailyProgress?> FindAsync(Guid userId, Guid goalId, DateTime date, CancellationToken ct = default);

    Task<List<GoalDailyProgress>> GetByDateAsync(Guid userId, DateTime date, CancellationToken ct = default);
}