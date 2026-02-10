using System;

namespace ClayMo.Module.Identity.Domain.Shared.Etos;

public class UserCreatedEto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? Email { get; set; }
}


