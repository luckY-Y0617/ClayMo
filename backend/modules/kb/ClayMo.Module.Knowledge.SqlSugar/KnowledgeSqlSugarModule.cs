using Volo.Abp.Modularity;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using ClayMo.Module.Knowledge.Domain;
using ClayMo.Module.Knowledge.Domain.Documents;
using ClayMo.Module.Knowledge.Domain.KnowledgeBases;
using Microsoft.Extensions.DependencyInjection;

namespace ClayMo.Module.Knowledge.SqlSugar;

[DependsOn(
    typeof(KnowledgeDomainModule)
)]
public class KnowledgeSqlSugarModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddTransient<IMigrationContributor, KnowledgeMigrationContributor>();
        
        Configure<SqlSugarEntityOptions>(options =>
        {
            options.Entity<Document>(entityOptions =>
            {
                entityOptions.DefaultWithDetailsFunc = query =>
                    query
                        .Includes(x => x.Content)
                        .Includes(x => x.Versions)
                        .Includes(x => x.Tags)
                        .Includes(x => x.OutgoingReferences)
                        .Includes(x => x.IncomingReferences);
            });
            
            options.Entity<KnowledgeBase>(entityOptions =>
            {
                entityOptions.DefaultWithDetailsFunc = query =>
                    query.Includes(x => x.Members);
            });
        });
    }
}