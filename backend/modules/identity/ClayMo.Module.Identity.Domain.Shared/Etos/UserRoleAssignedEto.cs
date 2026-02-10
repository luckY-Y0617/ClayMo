using System;
using System.Collections.Generic;

namespace ClayMo.Module.Identity.Domain.Shared.Etos;

public class UserRoleAssignedEto
{
    public Guid UserId { get; set; }
    public List<Guid> RoleIds { get; set; } = new();
}


