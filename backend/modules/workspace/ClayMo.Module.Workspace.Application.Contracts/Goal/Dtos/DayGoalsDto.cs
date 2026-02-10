using System;
using System.Collections.Generic;

namespace ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;

/// <summary>
/// 指定日期的目标进度 DTO
/// </summary>
public class DayGoalsDto
{
    /// <summary>
    /// 日期
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// 目标列表
    /// </summary>
    public List<DashboardGoalItemDto> Goals { get; set; } = new();

    /// <summary>
    /// 目标完成汇总
    /// </summary>
    public DashboardGoalSummaryDto Summary { get; set; } = new();
}

