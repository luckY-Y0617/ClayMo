using System;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal;

public interface IDashboardAppService
{
    Task<DashboardTodayDto> GetTodayAsync(DateTime? date = null, DateTime? weekStartDate = null, CancellationToken ct = default);
}