using System.Collections.Concurrent;
using ClayMo.Module.TenantManagement.Domain;
using ClayMo.Module.TenantManagement.Domain.Repositories;
using ClayMo.Module.TenantManagement.Domain.Shared;
using ClayMo.Module.TenantManagement.Domain.Shared.Enums;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Volo.Abp;
using Volo.Abp.MultiTenancy;
using Volo.Abp.Uow;

namespace ClayMo.Tools.Platform;

internal static class Common
{
    public static async Task RunWithHostAsync(Func<IServiceProvider, Task> action)
    {
        var builder = Host.CreateDefaultBuilder()
            .UseAutofac()
            .ConfigureServices((ctx, services) =>
            {
                services.AddApplication<ClayMoToolsAdminModule>();
            });

        using var host = builder.Build();

        await host.Services.GetRequiredService<IAbpApplicationWithExternalServiceProvider>()
            .InitializeAsync(host.Services);

        try
        {
            await action(host.Services);
        }
        finally
        {
            await host.Services.GetRequiredService<IAbpApplicationWithExternalServiceProvider>()
                .ShutdownAsync();
        }
    }

    public static CancellationTokenSource CreateConsoleCancellationTokenSource()
    {
        var cts = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            cts.Cancel();
        };
        return cts;
    }

    public static async Task<List<TenantAggregateRoot>> GetTenantsAsync(IServiceProvider sp, CancellationToken ct)
    {
        var uowManager = sp.GetRequiredService<IUnitOfWorkManager>();

        using var uow = uowManager.Begin(new AbpUnitOfWorkOptions
        {
            IsTransactional = false
        });

        var tenantRepo = sp.GetRequiredService<ISqlSugarTenantRepository>();
        var tenants = await tenantRepo.GetListAsync(includeDetails: false, cancellationToken: ct);

        await uow.CompleteAsync(ct);

        return tenants;
    }

    public static List<TenantAggregateRoot> FilterReadyTenants(List<TenantAggregateRoot> tenants, bool all, bool onlyReady)
    {
        if (!all && onlyReady)
        {
            tenants = tenants.FindAll(t => t.ProvisioningState == TenantProvisioningState.Ready);
        }

        return tenants;
    }

    public static async Task ExecuteForTenantsAsync(
        IServiceProvider sp,
        IReadOnlyCollection<TenantAggregateRoot> tenants,
        int parallel,
        Func<IServiceProvider, TenantAggregateRoot, CancellationToken, Task> perTenant,
        CancellationToken ct)
    {
        Console.WriteLine($"Total tenants: {tenants.Count} (parallel={parallel})");

        var startedAt = DateTimeOffset.UtcNow;
        var ok = 0;
        var fail = 0;
        var failed = new ConcurrentBag<(Guid TenantId, string Error)>();

        var semaphore = new SemaphoreSlim(parallel, parallel);
        var tasks = tenants.Select(async t =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                await perTenant(sp, t, ct);
                Interlocked.Increment(ref ok);
            }
            catch (Exception ex)
            {
                Interlocked.Increment(ref fail);
                failed.Add((t.Id, ex.Message));
                Console.WriteLine($"Error processing tenant {t.Id}: {ex}");
            }
            finally
            {
                semaphore.Release();
            }
        }).ToList();

        await Task.WhenAll(tasks);

        var elapsed = DateTimeOffset.UtcNow - startedAt;

        Console.WriteLine($"Done. ok={ok}, failed={fail}, elapsed={elapsed.TotalSeconds:F1}s");

        if (fail > 0)
        {
            Console.WriteLine("Failed tenants:");
            foreach (var (tenantId, error) in failed.OrderBy(x => x.TenantId))
                Console.WriteLine($"  - {tenantId}: {error}");

            Environment.ExitCode = 1;
        }
        else
        {
            Environment.ExitCode = 0;
        }
    }
}

