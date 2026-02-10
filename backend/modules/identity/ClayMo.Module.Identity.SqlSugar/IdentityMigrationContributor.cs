using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using ClayMo.Framework.SqlSugar.Migrations;
using ClayMo.Module.Identity.Domain.Identities;
using ClayMo.Module.Identity.Domain.Roles;
using ClayMo.Module.Identity.Domain.Teams;
using ClayMo.Module.Identity.Domain.Users;

namespace ClayMo.Module.Identity.SqlSugar;

[Migration(MigrationScopes.Both, order: 100)]
public sealed class IdentityMigrationContributor : CodeFirstMigrationContributorBase
{
    public override string Id => "identity/both/codefirst";
    public override string Description => "Identity module tables (CodeFirst InitTables) for host & tenant";

    protected override IEnumerable<Type> GetEntityTypes()
    {
        return new[]
        {
            typeof(User),
            typeof(UserProfile),
            typeof(Role),
            typeof(UserRole),
            typeof(RolePermission),
            typeof(ExternalAuth),
            typeof(LoginLog),
            typeof(Team),
            typeof(TeamMember),
            typeof(RefreshToken)
        };
    }
}