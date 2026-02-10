using System;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.Workspace.Domain.Focus;

public interface IFocusSessionRepository: ISqlSugarRepository<FocusSession, Guid>
{
    Task<FocusSession?> FindAsync(Guid id, CancellationToken ct = default);

    Task<FocusSession?> FindCurrentAsync(Guid userId,  CancellationToken ct = default);
}