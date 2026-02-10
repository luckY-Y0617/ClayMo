using ClayMo.Module.AuditLogging.Domain.Entities;

namespace ClayMo.Module.AuditLogging.Domain;

public class EntityChangeWithUsername
{
    public EntityChange EntityChange { get; set; }

    public string UserName { get; set; }
}