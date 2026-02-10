using System;
using System.Threading;
using System.Threading.Tasks;

namespace ClayMo.Framework.Authorization.Abstractions.Permissions;

public interface IAuthorizationExecutor
{
    Task<AuthorizationResult> AuthorizeAsync(
        Guid userId,
        string permissionCode,
        CancellationToken cancellationToken = default);
}

