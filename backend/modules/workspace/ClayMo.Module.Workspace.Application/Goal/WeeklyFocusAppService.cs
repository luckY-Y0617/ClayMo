using ClayMo.Framework.Core.Abstractions.Time;
using ClayMo.Framework.Core.Extensions;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Workspace.Application.Contracts.Goal;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;
using ClayMo.Module.Workspace.Domain.Goal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.Application.Services;
using Volo.Abp.Users;

namespace ClayMo.Module.Workspace.Application.Goal;

[Authorize]
[ApiController]
[Route("/api/app/workspace/week/focus-items")]
public class WeeklyFocusAppService : ApplicationService, IWeeklyFocusAppService
{
    private readonly ISqlSugarRepository<WeeklyFocusItem, Guid> _repo;
    private readonly ISystemClock _clock;
    private readonly ICurrentUser _currentUser;

    public WeeklyFocusAppService(ISqlSugarRepository<WeeklyFocusItem, Guid> repo, ISystemClock clock, ICurrentUser currentUser)
    {
        _repo = repo;
        _clock = clock;
        _currentUser = currentUser;
    }

    [HttpPost]
    public virtual async Task<WeeklyFocusItemDto> CreateAsync([FromBody] CreateWeeklyFocusItemInput input, CancellationToken ct = default)
    {
        var ws = _clock.Now.GetWeekStart();

        var entity = new WeeklyFocusItem(
            weekStartDate: ws,
            text: input.Text,
            sort: input.Sort);

        await _repo.InsertAsync(entity, autoSave: true, ct);
        return ObjectMapper.Map<WeeklyFocusItem, WeeklyFocusItemDto>(entity);
    }

    [HttpGet]
    public virtual async Task<List<WeeklyFocusItemDto>> GetListAsync([FromQuery] DateTime? weekStartDate = null, CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();
        var ws =  _clock.Now.GetWeekStart();

        var list = await _repo.GetListAsync(x => x.CreatorId == userId && x.WeekStartDate == ws, false, ct);
        return ObjectMapper.Map<List<WeeklyFocusItem>, List<WeeklyFocusItemDto>>(list);
    }

    [HttpDelete("{id:guid}")]
    public virtual async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();
        var entity = await _repo.FindAsync(x => x.Id == id && x.CreatorId == userId,false, ct) 
                     ?? throw new Volo.Abp.BusinessException("Workspace:WeeklyFocusNotFound");
        await _repo.DeleteAsync(entity, autoSave: true, ct);
    }
}
