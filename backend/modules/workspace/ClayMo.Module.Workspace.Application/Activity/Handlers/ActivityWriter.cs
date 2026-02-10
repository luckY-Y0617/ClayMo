using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Workspace.Domain.Activity;
using Volo.Abp.DependencyInjection;

namespace ClayMo.Module.Workspace.Application.Activity.Handlers;

public class ActivityWriter :  ITransientDependency
{
    private readonly IActivityLogRepository _repo;

    public ActivityWriter(IActivityLogRepository repo)
    {
        _repo = repo;
    }

    public virtual async Task WriteAsync(ActivityLog log, CancellationToken cancellationToken = default)
    {
        await _repo.InsertAsync(log, autoSave: true, cancellationToken);
    }
}