using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal;

public interface IWeeklyFocusAppService
{
    Task<WeeklyFocusItemDto> CreateAsync(CreateWeeklyFocusItemInput input, CancellationToken ct = default);
    Task<List<WeeklyFocusItemDto>> GetListAsync(DateTime? weekStartDate = null, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}