using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal;

public interface ITodayGoalsAppService
{
    Task<GoalDefinitionDto> CreateAsync(CreateGoalDefinitionInput input, CancellationToken ct = default);
    Task<List<GoalDefinitionDto>> GetListAsync(CancellationToken ct = default);
    Task<GoalDefinitionDto> UpdateAsync(Guid id, UpdateGoalDefinitionInput input, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    Task<List<GoalProgressItemDto>> GetProgressAsync(DateTime? date = null, CancellationToken ct = default);
    Task<List<GoalProgressItemDto>> CheckAsync(Guid goalId, GoalCheckInput input, CancellationToken ct = default);
    Task<TodaySummaryDto> GetSummaryAsync(DateTime? date = null, CancellationToken ct = default);
}