using System;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Workspace.Application.Contracts.Focus.Dtos;

namespace ClayMo.Module.Workspace.Application.Contracts.Focus;

public interface IFocusAppService
{
    Task<FocusSessionDto> StartAsync(FocusStartInput input, CancellationToken ct = default);
    Task<FocusSessionDto> PauseAsync(Guid id, CancellationToken ct = default);
    Task<FocusSessionDto> ResumeAsync(Guid id, CancellationToken ct = default);
    Task<FocusSessionDto> FinishAsync(Guid id, CancellationToken ct = default);
    Task<FocusSessionDto> CancelAsync(Guid id, CancellationToken ct = default);

    Task<FocusSessionDto?> GetCurrentAsync( CancellationToken ct = default);
    Task<FocusTodayStatsDto> GetTodayStatsAsync( CancellationToken ct = default);
}