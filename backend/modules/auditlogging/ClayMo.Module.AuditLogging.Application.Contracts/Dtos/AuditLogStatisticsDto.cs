using System;
using System.Collections.Generic;

namespace ClayMo.Module.AuditLogging.Application.Contracts.Dtos;

public class AuditLogStatisticsDto
{
    public Dictionary<DateTime, double> AverageExecutionDurationPerDay { get; set; } = new();
}

