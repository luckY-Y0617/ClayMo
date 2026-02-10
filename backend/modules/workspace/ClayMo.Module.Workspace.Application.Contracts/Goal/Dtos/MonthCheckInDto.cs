using System.Collections.Generic;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

/// <summary>
/// 月度打卡记录 DTO
/// </summary>
public class MonthCheckInDto
{
    /// <summary>
    /// 年份
    /// </summary>
    public int Year { get; set; }

    /// <summary>
    /// 月份
    /// </summary>
    public int Month { get; set; }

    /// <summary>
    /// 已打卡的日期列表 (格式: yyyy-MM-dd)
    /// </summary>
    public List<string> CheckedDates { get; set; } = new();

    /// <summary>
    /// 当前连续打卡天数
    /// </summary>
    public int StreakCount { get; set; }

    /// <summary>
    /// 本月打卡总天数
    /// </summary>
    public int MonthCount { get; set; }
}

