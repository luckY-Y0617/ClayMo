using System;

namespace ClayMo.Module.TenantManagement.Application.Contracts.Dtos;

public sealed class TenantBootstrapStateDto
{
    public string? State { get; set; }
    public DateTime? ProvisionedAtUtc { get; set; }
    public string? LastError { get; set; }
}