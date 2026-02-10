using System;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;
using Volo.Abp.Application.Services;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal;

public interface ICheckInAppService : IApplicationService
{
    Task<WeekCheckInDto> GetWeekAsync(DateTime? weekStartDate = null, CancellationToken ct = default);
    Task CheckInAsync(CheckInInput? input = null, CancellationToken ct = default);
}

/// <summary>
/// 打卡输入参数
/// </summary>
public class CheckInInput
{
    public DateTime? Date { get; set; }
    public string? Source { get; set; }
}
