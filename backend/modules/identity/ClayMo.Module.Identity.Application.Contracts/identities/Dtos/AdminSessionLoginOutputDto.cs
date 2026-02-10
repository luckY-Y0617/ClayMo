using System;

namespace ClayMo.Module.Identity.Application.Contracts.identities.Dtos;

public class AdminSessionLoginOutputDto
{
    public DateTime ExpireAtUtc { get; set; }
}
