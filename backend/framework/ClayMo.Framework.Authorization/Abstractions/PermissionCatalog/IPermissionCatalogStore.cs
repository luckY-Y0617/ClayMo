using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClayMo.Framework.Authorization.Abstractions.PermissionCatalog;

public interface IPermissionCatalogStore
{
    Task<IReadOnlyList<PermissionModule>> GetModules();
    Task<PermissionModuleDetail> GetModule(string moduleCode);
}

