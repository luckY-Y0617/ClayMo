using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Workspace.Application.Contracts.Activity.Dtos;

namespace ClayMo.Module.Workspace.Application.Contracts.Activity;

public interface IActivityAppService
{
    Task<List<ActivityDto>> GetListAsync(ActivityGetListInput input, CancellationToken cancellationToken = default);
}