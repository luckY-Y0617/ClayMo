using System;

namespace ClayMo.Module.Identity.Application.Contracts.identities.Dtos;


public sealed class AppRefreshOutputDto
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime AccessTokenExpiresAtUtc { get; set; }
}