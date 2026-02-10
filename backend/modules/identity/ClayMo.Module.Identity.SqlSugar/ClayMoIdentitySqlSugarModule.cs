using ClayMo.Framework.SqlSugar;
using ClayMo.Module.Identity.Domain;
using ClayMo.Module.Identity.Domain.Roles;
using ClayMo.Module.Identity.Domain.Users;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using ClayMo.Module.Identity.Domain.Teams;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;

namespace ClayMo.Module.Identity.SqlSugar;

[DependsOn(
    typeof(ClayMoFrameworkSqlSugarModule),
    typeof(ClayMoFrameworkIdentityDomainModule))]
public class ClayMoIdentitySqlSugarModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddTransient<IMigrationContributor, IdentityMigrationContributor>();

        Configure<SqlSugarEntityOptions>(options =>
        {
            options.Entity<User>(entityOptions =>
            {
                entityOptions.DefaultWithDetailsFunc = query =>
                    query.Includes(x => x.Profile)
                         .Includes(x => x.Roles);
            });
            
            options.Entity<Role>(entityOptions =>
            {
                entityOptions.DefaultWithDetailsFunc = query =>
                    query.Includes(x => x.Permissions);
            });
            
            options.Entity<Team>(entityOptions =>
            {
                entityOptions.DefaultWithDetailsFunc = query =>
                    query.Includes(x => x.Members);
            });
        });
    }
}

