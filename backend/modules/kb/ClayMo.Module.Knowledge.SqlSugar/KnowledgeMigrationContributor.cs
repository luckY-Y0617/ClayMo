using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using ClayMo.Framework.SqlSugar.Migrations;
using ClayMo.Module.Knowledge.Domain.Comments;
using ClayMo.Module.Knowledge.Domain.Documents;
using ClayMo.Module.Knowledge.Domain.KnowledgeBases;
using ClayMo.Module.Knowledge.Domain.Members;
using ClayMo.Module.Knowledge.Domain.References;
using ClayMo.Module.Knowledge.Domain.Tags;
using ClayMo.Module.Knowledge.Domain.Versions;

namespace ClayMo.Module.Knowledge.SqlSugar;

[Migration(MigrationScopes.Tenant, order: 200)]
public sealed class KnowledgeMigrationContributor : CodeFirstMigrationContributorBase
{
    public override string Id => "knowledge/tenant/codefirst";
    public override string Description => "Knowledge module tenant tables (CodeFirst InitTables)";

    protected override IEnumerable<Type> GetEntityTypes()
    {
        return new[]
        {
            // Comments
            typeof(Comment),

            // Documents
            typeof(Document),
            typeof(DocumentContent),

            // KnowledgeBases
            typeof(KnowledgeBase),

            // Members
            typeof(KnowledgeBaseMember),

            // References
            typeof(DocumentReference),

            // Tags
            typeof(Tag),
            typeof(DocumentTag),

            // Versions
            typeof(DocumentVersion)
        };
    }
}