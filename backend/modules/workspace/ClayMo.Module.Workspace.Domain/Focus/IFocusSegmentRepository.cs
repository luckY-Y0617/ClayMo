using System;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.Workspace.Domain.Focus;

public interface IFocusSegmentRepository: ISqlSugarRepository<FocusSegment, Guid>
{
    Task<int> SumDurationSecondsAsync(Guid sessionId, CancellationToken ct = default);

    Task<FocusSegment?> FindRunningSegmentAsync(Guid sessionId, CancellationToken ct = default);
}