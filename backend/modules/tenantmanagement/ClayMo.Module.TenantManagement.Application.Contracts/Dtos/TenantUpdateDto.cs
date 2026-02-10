using SqlSugar;

namespace ClayMo.Module.TenantManagement.Application.Contracts.Dtos;

public class TenantUpdateDto
{
    public string? Name { get; set; }

    public DbType? DbType { get; set; }

    public string? DefaultConnectionString { get; set; }

}