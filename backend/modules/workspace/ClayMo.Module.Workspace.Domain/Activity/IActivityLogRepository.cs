using System;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.Workspace.Domain.Activity;

public interface IActivityLogRepository: ISqlSugarRepository<ActivityLog, Guid>
{
    
}