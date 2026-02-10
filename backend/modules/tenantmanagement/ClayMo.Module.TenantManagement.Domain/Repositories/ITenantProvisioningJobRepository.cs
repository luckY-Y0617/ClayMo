using System;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.TenantManagement.Domain.Repositories;

public interface ITenantProvisioningJobRepository:  ISqlSugarRepository<TenantProvisioningJob, Guid>
{
    Task EnqueueAsync(Guid tenantId, CancellationToken ct = default);

    Task<TenantProvisioningJob?> FindNextRunnableAsync(DateTime utcNow, CancellationToken ct = default);

    Task<bool> TryAcquireLeaseAsync(Guid tenantId, string owner, DateTime lockUntilUtc, DateTime utcNow, CancellationToken ct = default);

    Task MarkSucceededAsync(Guid tenantId, DateTime utcNow, CancellationToken ct = default);

    Task MarkFailedAsync(Guid tenantId, string error, DateTime utcNow, CancellationToken ct = default);
}