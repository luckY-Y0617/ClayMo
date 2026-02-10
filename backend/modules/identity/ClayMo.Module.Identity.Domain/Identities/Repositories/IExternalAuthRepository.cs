using System;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Framework.SqlSugar.Abstractions;

namespace ClayMo.Module.Identity.Domain.Identities.Repositories;

public interface IExternalAuthRepository : ISqlSugarRepository<ExternalAuth, Guid>
{
    Task<ExternalAuth?> FindByProviderAsync(Guid userId, string providerName, string providerKey, CancellationToken cancellationToken = default);
}

