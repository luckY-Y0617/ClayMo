using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.Workspace.Domain.Goal.Repositories;

public interface IGoalDefinitionRepository: ISqlSugarRepository<GoalDefinition, Guid>
{
    Task<GoalDefinition?> FindAsync(Guid id, Guid userId, CancellationToken ct = default);

    Task<List<GoalDefinition>> GetActiveListAsync(Guid userId, CancellationToken ct = default);
}