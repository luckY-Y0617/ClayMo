using ClayMo.Framework.Core.Abstractions.Time;
using ClayMo.Framework.Core.Extensions;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;
using ClayMo.Module.Workspace.Domain.Goal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Users;

namespace ClayMo.Module.Workspace.Application.Goal;

[Authorize]
[RemoteService]
[Route("api/app/workspace/dashboard")]
public class WorkspaceDashboardAppService : ApplicationService
{
    private readonly ISqlSugarRepository<GoalDefinition, Guid> _goalDefinitionRepository;
    private readonly ISqlSugarRepository<GoalDailyProgress, Guid> _goalDailyProgressRepository;
    private readonly ISqlSugarRepository<WeeklyFocusItem, Guid> _weeklyFocusRepository;
    private readonly ISqlSugarRepository<CheckIn, Guid> _checkInRepository;
    private readonly ISystemClock _clock;

    public WorkspaceDashboardAppService(
        ISqlSugarRepository<GoalDefinition, Guid> goalDefinitionRepository,
        ISqlSugarRepository<GoalDailyProgress, Guid> goalDailyProgressRepository,
        ISqlSugarRepository<WeeklyFocusItem, Guid> weeklyFocusRepository,
        ISqlSugarRepository<CheckIn, Guid> checkInRepository,
        ISystemClock clock)
    {
        _goalDefinitionRepository = goalDefinitionRepository;
        _goalDailyProgressRepository = goalDailyProgressRepository;
        _weeklyFocusRepository = weeklyFocusRepository;
        _checkInRepository = checkInRepository;
        _clock = clock;
    }

    [HttpGet("today")]
    public async Task<DashboardTodayDto> GetTodayAsync(DateTime? date = null, DateTime? weekStart = null)
    {
        var today = (date ?? _clock.Now.Date).Date;
        var weekStartDate = weekStart ?? today.GetWeekStart();

        var userId = CurrentUser.GetId();

        var goalDefs = await _goalDefinitionRepository.GetListAsync(
            x => x.UserId == userId && x.IsActive);

        var progresses = await _goalDailyProgressRepository.GetListAsync(
            x => x.CreatorId == userId && x.Date == today);

        var goals = goalDefs
            .OrderBy(x => x.Sort)
            .Select(def =>
            {
                var progress = progresses.FirstOrDefault(p => p.GoalId == def.Id);

                return new DashboardGoalItemDto
                {
                    Id = def.Id,
                    Title = def.Title,
                    Mode = def.Mode.ToString(),
                    TargetCount = def.TargetCount,
                    DoneCount = progress?.DoneCount ?? 0,
                    IsChecked = progress?.IsChecked ?? false
                };
            })
            .ToList();

        var completedCount = goals.Count(g =>
            g.Mode == "Checkbox"
                ? g.IsChecked
                : g.DoneCount >= g.TargetCount);

        var weeklyFocus = await _weeklyFocusRepository.GetListAsync(
            x => x.CreatorId == userId && x.WeekStartDate == weekStartDate);

        var weekCheckIns = await _checkInRepository.GetListAsync(
            x => x.CreatorId == userId && x.CreationTime >= weekStartDate && x.CreationTime < weekStartDate.AddDays(7));

        var days = Enumerable.Range(0, 7)
            .Select(i =>
            {
                var day = weekStartDate.AddDays(i);
                return new DashboardDayCheckInDto
                {
                    Date = day,
                    Checked = weekCheckIns.Any(c => c.CreationTime == day)
                };
            })
            .ToList();

        return new DashboardTodayDto
        {
            Date = today,
            Goals = goals,
            GoalsSummary = new DashboardGoalSummaryDto
            {
                Total = goals.Count,
                Completed = completedCount
            },
            WeeklyFocus = weeklyFocus
                .OrderBy(x => x.Sort)
                .Select(x => new DashboardWeeklyFocusItemDto
                {
                    Id = x.Id,
                    Text = x.Text
                })
                .ToList(),
            WeekCheckIn = new DashboardWeekCheckInDto
            {
                WeekStart = weekStartDate,
                Days = days,
                WeekCount = weekCheckIns.Count,
                StreakCount = CalculateStreak(weekCheckIns, today)
            }
        };
    }


    /// <summary>
    /// 获取指定月份的打卡记录
    /// </summary>
    [HttpGet("month-checkin")]
    public async Task<MonthCheckInDto> GetMonthCheckInAsync(int? year = null, int? month = null)
    {
        var now = _clock.Now;
        var targetYear = year ?? now.Year;
        var targetMonth = month ?? now.Month;

        var monthStart = new DateTime(targetYear, targetMonth, 1);
        var monthEnd = monthStart.AddMonths(1);

        var userId = CurrentUser.GetId();

        var checkIns = await _checkInRepository.GetListAsync(
            x => x.CreatorId == userId && x.CreationTime >= monthStart && x.CreationTime < monthEnd);

        var checkedDates = checkIns
            .Select(x => x.CreationTime.ToString("yyyy-MM-dd"))
            .Distinct()
            .ToList();

        // 计算当前连续打卡天数
        var today = now.Date;
        var streak = 0;
        var cursor = today;

        while (true)
        {
            var hasCheckIn = await _checkInRepository.AnyAsync(
                x => x.CreatorId == userId && x.CreationTime == cursor);
            if (!hasCheckIn) break;
            streak++;
            cursor = cursor.AddDays(-1);
        }

        // 计算本月打卡总天数
        var monthCount = checkedDates.Count;

        return new MonthCheckInDto
        {
            Year = targetYear,
            Month = targetMonth,
            CheckedDates = checkedDates,
            StreakCount = streak,
            MonthCount = monthCount
        };
    }

    /// <summary>
    /// 获取指定日期的目标进度
    /// </summary>
    [HttpGet("day-goals")]
    public async Task<DayGoalsDto> GetDayGoalsAsync(DateTime? date = null)
    {
        var targetDate = (date ?? _clock.Now.Date).Date;
        var userId = CurrentUser.GetId();

        var goalDefs = await _goalDefinitionRepository.GetListAsync(
            x => x.UserId == userId && x.IsActive);

        var progresses = await _goalDailyProgressRepository.GetListAsync(
            x => x.CreatorId == userId && x.Date == targetDate);

        var goals = goalDefs
            .OrderBy(x => x.Sort)
            .Select(def =>
            {
                var progress = progresses.FirstOrDefault(p => p.GoalId == def.Id);
                return new DashboardGoalItemDto
                {
                    Id = def.Id,
                    Title = def.Title,
                    Mode = def.Mode.ToString(),
                    TargetCount = def.TargetCount,
                    DoneCount = progress?.DoneCount ?? 0,
                    IsChecked = progress?.IsChecked ?? false
                };
            })
            .ToList();

        var completedCount = goals.Count(g =>
            g.Mode == "Checkbox"
                ? g.IsChecked
                : g.DoneCount >= g.TargetCount);

        return new DayGoalsDto
        {
            Date = targetDate,
            Goals = goals,
            Summary = new DashboardGoalSummaryDto
            {
                Total = goals.Count,
                Completed = completedCount
            }
        };
    }

    private static int CalculateStreak(
        List<CheckIn> checkIns,
        DateTime today)
    {
        var dates = checkIns
            .Select(x => x.CreationTime)
            .Distinct()
            .OrderByDescending(x => x)
            .ToList();

        var streak = 0;
        var cursor = today;

        while (dates.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }
}
