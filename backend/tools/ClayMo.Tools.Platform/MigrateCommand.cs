using System.CommandLine;
using ClayMo.Framework.SqlSugar.Abstractions.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.MultiTenancy;
using Volo.Abp.Uow;

namespace ClayMo.Tools.Platform;

internal static class MigrateCommand
{
    public static Command Build()
    {
        var cmd = new Command("migrate", "Sync database schema (no seed, no tenant status change)");

        var ensureDbOpt = new Option<bool>("--ensure-db", () => true, "Ensure database exists (CreateDatabase)");
        var useTxOpt = new Option<bool>("--use-tx", () => false, "Run in transaction (not recommended for DDL)");

        cmd.AddGlobalOption(ensureDbOpt);
        cmd.AddGlobalOption(useTxOpt);

        // migrate host
        var hostCmd = new Command("host", "Migrate host database schema");
        hostCmd.SetHandler(async (bool ensureDb, bool useTx) =>
        {
            using var cts = Common.CreateConsoleCancellationTokenSource();

            await Common.RunWithHostAsync(async sp =>
            {
                var runner = sp.GetRequiredService<IMigrationRunner>();
                var currentTenant = sp.GetRequiredService<ICurrentTenant>();
                var uowManager = sp.GetRequiredService<IUnitOfWorkManager>();

                using (currentTenant.Change(null))
                {
                    using var uow = uowManager.Begin(requiresNew: true, isTransactional: true);

                    var result = await runner.MigrateAsync(
                        new MigrationRequest(
                            Scope: MigrationScopes.Host,
                            Flags: BuildFlags(ensureDb, useTx)),
                        cts.Token);

                    PrintResult(result);
                    Environment.ExitCode = result.Succeeded ? 0 : 1;
                    await uow.CompleteAsync();
                }
            });
        }, ensureDbOpt, useTxOpt);

        // migrate tenant --id
        var tenantCmd = new Command("tenant", "Migrate a tenant database schema");
        var tenantIdOpt = new Option<Guid>("--id", "Tenant id") { IsRequired = true };
        tenantCmd.AddOption(tenantIdOpt);

        tenantCmd.SetHandler(async (Guid tenantId, bool ensureDb, bool useTx) =>
        {
            using var cts = Common.CreateConsoleCancellationTokenSource();

            await Common.RunWithHostAsync(async sp =>
            {
                var runner = sp.GetRequiredService<IMigrationRunner>();
                var currentTenant = sp.GetRequiredService<ICurrentTenant>();
                var uowManager = sp.GetRequiredService<IUnitOfWorkManager>();

                using (currentTenant.Change(tenantId))
                {
                    using var uow = uowManager.Begin(requiresNew: true, isTransactional: true);

                    var result = await runner.MigrateAsync(
                        new MigrationRequest(
                            Scope: MigrationScopes.Tenant,
                            Flags: BuildFlags(ensureDb, useTx)),
                        cts.Token);

                    PrintResult(result);
                    Environment.ExitCode = result.Succeeded ? 0 : 1;
                    await uow.CompleteAsync();
                }
            });
        }, tenantIdOpt, ensureDbOpt, useTxOpt);

        // migrate tenants (batch)
        var tenantsCmd = new Command("tenants", "Migrate multiple tenant databases schema");

        var allOpt = new Option<bool>("--all", () => false, "Migrate all tenants (including NotReady/Failed).");
        var onlyReadyOpt = new Option<bool>("--only-ready", () => true, "Only migrate Ready tenants (default: true). Ignored when --all=true.");
        var parallelOpt = new Option<int>("--parallel", () => 1, "Parallelism for batch migration (default: 1). Use with caution.");
        parallelOpt.AddValidator(r =>
        {
            if (r.GetValueForOption(parallelOpt) <= 0)
                r.ErrorMessage = "--parallel must be greater than 0.";
        });

        tenantsCmd.AddOption(allOpt);
        tenantsCmd.AddOption(onlyReadyOpt);
        tenantsCmd.AddOption(parallelOpt);

        tenantsCmd.SetHandler(async (bool all, bool onlyReady, int parallel, bool ensureDb, bool useTx) =>
        {
            using var cts = Common.CreateConsoleCancellationTokenSource();

            await Common.RunWithHostAsync(async sp =>
            {
                var tenants = await Common.GetTenantsAsync(sp, cts.Token);
                tenants = Common.FilterReadyTenants(tenants, all, onlyReady);

                if (tenants.Count == 0)
                {
                    Console.WriteLine("No tenants to migrate.");
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

                        var runner = scopedSp.GetRequiredService<IMigrationRunner>();
                        var currentTenant = scopedSp.GetRequiredService<ICurrentTenant>();
                        var uowManager = scopedSp.GetRequiredService<IUnitOfWorkManager>();

                        Console.WriteLine($"==> Migrating tenant {t.Id} ...");

                        using (currentTenant.Change(t.Id))
                        using (var uow = uowManager.Begin(requiresNew: true, isTransactional: true))
                        {
                            var result = await runner.MigrateAsync(
                                new MigrationRequest(
                                    Scope: MigrationScopes.Tenant,
                                    Flags: BuildFlags(ensureDb, useTx)),
                                token);

                            PrintResult(result);

                            if (!result.Succeeded)
                            {
                                throw result.Error ?? new Exception("Migration failed");
                            }

                            await uow.CompleteAsync();
                        }
                    },
                    cts.Token);
            });
        }, allOpt, onlyReadyOpt, parallelOpt, ensureDbOpt, useTxOpt);

        cmd.AddCommand(hostCmd);
        cmd.AddCommand(tenantCmd);
        cmd.AddCommand(tenantsCmd);

        return cmd;
    }


    private static void PrintResult(MigrationResult r)
    {
        Console.WriteLine($"Succeeded: {r.Succeeded}");
        Console.WriteLine($"Applied: {r.AppliedCount}, Skipped: {r.SkippedCount}");
        if (r.Error != null) Console.WriteLine("Error: " + r.Error);
    }

    private static MigrationFlags BuildFlags(bool ensureDb, bool useTx)
    {
        var flags = MigrationFlags.None;

        if (ensureDb) flags |= MigrationFlags.EnsureDatabaseCreated;
        if (useTx) flags |= MigrationFlags.UseTransaction;

        return flags;
    }

    private static CancellationTokenSource CreateConsoleCancellationTokenSource()
    {
        var cts = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            cts.Cancel();
        };
        return cts;
    }
}
