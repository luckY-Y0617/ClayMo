using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.Core.Abstractions.Time;
using ClayMo.Framework.Core.Extensions;
using ClayMo.Module.Workspace.Application.Contracts.Goal;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;
using ClayMo.Module.Workspace.Domain.Goal;
using ClayMo.Module.Workspace.Domain.Goal.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Users;

namespace ClayMo.Module.Workspace.Application.Goal;

[Authorize]
[RemoteService]
[Route("api/app/workspace/week/checkin")]
public class CheckInAppService : ApplicationService, ICheckInAppService
{
    private readonly ICheckInRepository _checkInRepository;
    private readonly ISystemClock _clock;

    public CheckInAppService(
        ICheckInRepository checkInRepository,
        ISystemClock clock)
    {
        _checkInRepository = checkInRepository;
        _clock = clock;
    }

    /// <summary>
    /// 获取本周打卡信息
    /// </summary>
    [HttpGet]
    public async Task<WeekCheckInDto> GetWeekAsync([FromQuery] DateTime? weekStartDate = null, CancellationToken ct = default)
    {
        var userId = CurrentUser.GetId();
        var weekStart = weekStartDate?.Date ?? _clock.Now.GetWeekStart();
        var weekEnd = weekStart.AddDays(7);
        var today = _clock.Now.Date;

        var checkIns = await _checkInRepository.GetRangeAsync(userId, weekStart, weekEnd, ct);

        var days = Enumerable.Range(0, 7)
            .Select(i =>
            {
                var date = weekStart.AddDays(i);
                return new WeekCheckInDto.WeekDayDto
                {
                    Date = date,
                    Checked = checkIns.Any(c => c.CreationTime.Date == date)
                };
            })
            .ToList();

        // 计算连续打卡天数
        var streak = await CalculateStreakAsync(userId, today, ct);

        return new WeekCheckInDto
        {
            WeekStart = weekStart,
            Days = days,
            WeekCount = checkIns.Count,
            StreakCount = streak
        };
    }

    /// <summary>
    /// 打卡
    /// </summary>
    [HttpPost]
    public async Task CheckInAsync([FromBody] CheckInInput? input = null, CancellationToken ct = default)
    {
        var userId = CurrentUser.GetId();
        var targetDate = input?.Date?.Date ?? _clock.Now.Date;
        var source = input?.Source ?? "manual";

        // 检查今天是否已经打卡
        var existing = await _checkInRepository.FindAsync(userId, targetDate, ct);
        if (existing != null)
        {
            throw new BusinessException("Workspace:AlreadyCheckedIn", "今天已经打卡过了");
        }

        var checkIn = new CheckIn(source);
        await _checkInRepository.InsertAsync(checkIn, autoSave: true, ct);
    }

    private async Task<int> CalculateStreakAsync(Guid userId, DateTime today, CancellationToken ct)
    {
        var streak = 0;
        var cursor = today;

        while (true)
        {
            var hit = await _checkInRepository.FindAsync(userId, cursor, ct);
            if (hit == null) break;
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }
}
