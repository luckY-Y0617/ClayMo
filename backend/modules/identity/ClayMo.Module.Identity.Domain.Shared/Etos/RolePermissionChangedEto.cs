using System;
using System.Collections.Generic;

namespace ClayMo.Module.Identity.Domain.Shared.Etos;

public class RolePermissionChangedEto
{
    public Guid RoleId { get; set; }
    public List<string> PermissionCodes { get; set; } = new();
}

