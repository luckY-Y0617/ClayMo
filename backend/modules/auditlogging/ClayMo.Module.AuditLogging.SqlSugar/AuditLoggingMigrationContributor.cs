using System;
using System.Collections.Generic;
using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using ClayMo.Framework.SqlSugar.Migrations;
using ClayMo.Module.AuditLogging.Domain.Entities;

namespace ClayMo.Module.AuditLogging.SqlSugar;

[Migration(MigrationScopes.Both, order: 150)]
public sealed class AuditLoggingMigrationContributor : CodeFirstMigrationContributorBase
{
    public override string Id => "auditlogging/tenant/codefirst";
    public override string Description => "AuditLogging module tenant tables (CodeFirst InitTables)";

    protected override IEnumerable<Type> GetEntityTypes()
    {
        return new[]
        {
            typeof(AuditLogAction),
            typeof(AuditLog),
            typeof(EntityChange),
            typeof(EntityPropertyChange)
        };
    }
}