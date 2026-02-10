using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Data;
using Volo.Abp.MultiTenancy;
using Volo.Abp.Uow;

namespace ClayMo.Tools.Platform;

internal static class SeedCommand
{
    public static Command Build()
    {
        var cmd = new Command("seed", "Run ABP data seed (host/tenant). Intended for CI/CD upgrade seed. (no schema migration)");

        // seed host
        var hostCmd = new Command("host", "Run host data seed");
        hostCmd.SetHandler((Func<Task>)(async () =>
        {
            using var cts = Common.CreateConsoleCancellationTokenSource();

            await Common.RunWithHostAsync(async sp =>
            {
                var dataSeeder = sp.GetRequiredService<IDataSeeder>();
                var currentTenant = sp.GetRequiredService<ICurrentTenant>();
                var uowManager = sp.GetRequiredService<IUnitOfWorkManager>();

                using (currentTenant.Change(null))
                using (var uow = uowManager.Begin(new AbpUnitOfWorkOptions { IsTransactional = false }))
                {
                    Console.WriteLine("==> Seeding host ...");
                    await dataSeeder.SeedAsync(new DataSeedContext(null));
                    await uow.CompleteAsync(cts.Token);
                }

                Console.WriteLine("Host seed done.");
                Environment.ExitCode = 0;
            });
        }));

        // seed tenant --id
        var tenantCmd = new Command("tenant", "Run data seed for a single tenant");
        var tenantIdOpt = new Option<Guid>("--id", "Tenant id") { IsRequired = true };
        tenantCmd.AddOption(tenantIdOpt);

        tenantCmd.SetHandler(async (Guid tenantId) =>
        {
            using var cts = Common.CreateConsoleCancellationTokenSource();

            await Common.RunWithHostAsync(async sp =>
            {
                var dataSeeder = sp.GetRequiredService<IDataSeeder>();
                var currentTenant = sp.GetRequiredService<ICurrentTenant>();
                var uowManager = sp.GetRequiredService<IUnitOfWorkManager>();

                using (currentTenant.Change(tenantId))
                using (var uow = uowManager.Begin(new AbpUnitOfWorkOptions { IsTransactional = false }))
                {
                    Console.WriteLine($"==> Seeding tenant {tenantId} ...");
                    await dataSeeder.SeedAsync(new DataSeedContext(tenantId));
                    await uow.CompleteAsync(cts.Token);
                }

                Console.WriteLine($"Tenant seed done: {tenantId}");
                Environment.ExitCode = 0;
            });
        }, tenantIdOpt);

        // seed tenants (batch)
        var tenantsCmd = new Command("tenants", "Run data seed for multiple tenants (CI/CD primary path)");

        var allOpt = new Option<bool>("--all", () => false, "Seed all tenants (including NotReady/Failed).");
        var onlyReadyOpt = new Option<bool>("--only-ready", () => true, "Only seed Ready tenants (default: true). Ignored when --all=true.");
        var parallelOpt = new Option<int>("--parallel", () => 1, "Parallelism for batch seed (default: 1). Use with caution.");

        parallelOpt.AddValidator(r =>
        {
            if (r.GetValueForOption(parallelOpt) <= 0)
                r.ErrorMessage = "--parallel must be greater than 0.";
        });

        tenantsCmd.AddOption(allOpt);
        tenantsCmd.AddOption(onlyReadyOpt);
        tenantsCmd.AddOption(parallelOpt);

        tenantsCmd.SetHandler(async (bool all, bool onlyReady, int parallel) =>
        {
            using var cts = Common.CreateConsoleCancellationTokenSource();

            await Common.RunWithHostAsync(async sp =>
            {
                var tenants = await Common.GetTenantsAsync(sp, cts.Token);
                tenants = Common.FilterReadyTenants(tenants, all, onlyReady);

                if (tenants.Count == 0)
                {
                    Console.WriteLine("No tenants to seed.");
                    Environment.ExitCode = 0;
                    return;
                }

                await Common.ExecuteForTenantsAsync(
                    sp,
                    tenants,
                    parallel,
                    async (rootSp, t, token) =>
                    {
                        using var scope = rootSp.CreateScope();
                        var scopedSp = scope.ServiceProvider;

                        var dataSeeder = scopedSp.GetRequiredService<IDataSeeder>();
                        var currentTenant = scopedSp.GetRequiredService<ICurrentTenant>();
                        var uowManager = scopedSp.GetRequiredService<IUnitOfWorkManager>();

                        Console.WriteLine($"==> Seeding tenant {t.Id} ...");

                        using (currentTenant.Change(t.Id))
                        using (var uow = uowManager.Begin(new AbpUnitOfWorkOptions { IsTransactional = false }))
                        {
                            await dataSeeder.SeedAsync(new DataSeedContext(t.Id));
                            await uow.CompleteAsync(token);
                        }
                    },
                    cts.Token);
            });
        }, allOpt, onlyReadyOpt, parallelOpt);

        cmd.AddCommand(hostCmd);
        cmd.AddCommand(tenantCmd);
        cmd.AddCommand(tenantsCmd);

        return cmd;
    }

}
