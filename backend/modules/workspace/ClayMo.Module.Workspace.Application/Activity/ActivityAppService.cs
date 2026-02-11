using ClayMo.Module.Workspace.Application.Contracts.Activity;
using ClayMo.Module.Workspace.Application.Contracts.Activity.Dtos;
using ClayMo.Module.Workspace.Domain.Activity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SqlSugar;
using Volo.Abp.Application.Services;

namespace ClayMo.Module.Workspace.Application.Activity;

[Authorize]
[ApiController]
[Route("/api/app/workspace/activity")]
public class ActivityAppService : ApplicationService, IActivityAppService
{
    private readonly IActivityLogRepository _repo;

    public ActivityAppService(IActivityLogRepository repo)
    {
        _repo = repo;
    }

    [HttpGet]
    //[RequirePermission(WorkspaceActivityPermissions.Activity.View)]
    public virtual async Task<List<ActivityDto>> GetListAsync(
        [FromQuery] ActivityGetListInput input,
        CancellationToken cancellationToken = default)
    {
        Guid? currentTeamId = string.IsNullOrWhiteSpace(input.TeamId)
            ? null
            : Guid.Parse(input.TeamId);

        var query = await _repo.GetQueryableAsync();

        query = query.Where(x => x.TeamId == currentTeamId);

        if (!string.IsNullOrWhiteSpace(input.ObjectType))
        {
            var ot = input.ObjectType.Trim();
            query = query.Where(x => x.ObjectType == ot);
        }

        if (input.ObjectId.HasValue)
        {
            var oid = input.ObjectId.Value;
            query = query.Where(x => x.ObjectId == oid);
        }

        if (!string.IsNullOrWhiteSpace(input.SubjectType))
        {
            var st = input.SubjectType.Trim();
            query = query.Where(x => x.SubjectType == st);
        }

        if (input.SubjectId.HasValue)
        {
            var sid = input.SubjectId.Value;
            query = query.Where(x => x.SubjectId == sid);
        }

        var list = await query
            .OrderBy(x => x.OccurredAt, OrderByType.Desc)
            .Skip(input.SkipCount)
            .Take(input.MaxResultCount)
            .ToListAsync(cancellationToken);

        return ObjectMapper.Map<List<ActivityLog>, List<ActivityDto>>(list);
    }
}
