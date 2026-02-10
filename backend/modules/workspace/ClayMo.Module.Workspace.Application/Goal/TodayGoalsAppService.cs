using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ClayMo.Module.Workspace.Application.Contracts.Goal;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;
using ClayMo.Module.Workspace.Domain.Goal;
using ClayMo.Module.Workspace.Domain.Goal.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Timing;
using Volo.Abp.Users;

namespace ClayMo.Module.Workspace.Application.Goal;

[Authorize]
[ApiController]
[Route("/api/app/workspace/today/goals")]
public class TodayGoalsAppService : ApplicationService, ITodayGoalsAppService
{
    private readonly IGoalDefinitionRepository _defs;
    private readonly IGoalDailyProgressRepository _dailys;
    private readonly ICheckInRepository _checks;
    private readonly IClock _clock;
    private readonly ICurrentUser _currentUser;

    public TodayGoalsAppService(
        IGoalDefinitionRepository defs,
        IGoalDailyProgressRepository dailys,
        ICheckInRepository checks,
        IClock clock,
        ICurrentUser currentUser)
    {
        _defs = defs;
        _dailys = dailys;
        _checks = checks;
        _clock = clock;
        _currentUser = currentUser;
    }

    [HttpPost]
    public virtual async Task<GoalDefinitionDto> CreateAsync([FromBody] CreateGoalDefinitionInput input, CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();
        var entity = new GoalDefinition(
            userId: userId,
            title: input.Title,
            mode: input.Mode,
            targetCount: input.TargetCount,
            sort: input.Sort,
            isActive: true);

        await _defs.InsertAsync(entity, autoSave: true, ct);
        return ObjectMapper.Map<GoalDefinition, GoalDefinitionDto>(entity);
    }

    [HttpGet]
    public virtual async Task<List<GoalDefinitionDto>> GetListAsync(CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();
        var list = await _defs.GetActiveListAsync(userId, ct);
        return ObjectMapper.Map<List<GoalDefinition>, List<GoalDefinitionDto>>(list);;
    }

    [HttpPut("{id:guid}")]
    public virtual async Task<GoalDefinitionDto> UpdateAsync(Guid id, [FromBody] UpdateGoalDefinitionInput input, CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();
        var entity = await _defs.FindAsync(id, userId, ct) ?? throw new BusinessException("Workspace:GoalNotFound");

        entity.SetTitle(input.Title);
        entity.SetMode(input.Mode, input.TargetCount);
        entity.SetSort(input.Sort);
        entity.SetActive(input.IsActive);

        await _defs.UpdateAsync(entity, autoSave: true, ct);
        return ObjectMapper.Map<GoalDefinition, GoalDefinitionDto>(entity);;
    }

    [HttpDelete("{id:guid}")]
    public virtual async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();
        var entity = await _defs.FindAsync(id, userId, ct) 
                     ?? throw new BusinessException("Workspace:GoalNotFound");
        await _defs.DeleteAsync(entity, autoSave: true, ct);
    }

    [HttpGet("progress")]
    public virtual async Task<List<GoalProgressItemDto>> GetProgressAsync([FromQuery] DateTime? date = null, CancellationToken ct = default)
    {
        var d = (date ?? _clock.Now).Date;
        var pairs = await GetOrBuildProgressAsync(d, ct);
        
        return pairs.Select(x =>
        {
            var prog = x.Prog;
            return new GoalProgressItemDto
            {
                GoalId = x.Def.Id,
                Title = x.Def.Title,
                Mode = x.Def.Mode,
                TargetCount = x.Def.TargetCount,
                Sort = x.Def.Sort,
                DoneCount = prog?.DoneCount ?? 0,
                IsChecked = prog?.IsChecked ?? false
            };
        }).OrderBy(x => x.Sort).ToList();
    }

    [HttpPost("{goalId:guid}/check")]
    public virtual async Task<List<GoalProgressItemDto>> CheckAsync(Guid goalId, [FromBody] GoalCheckInput input, CancellationToken ct = default)
    {
        var d = (input.Date ?? _clock.Now).Date;
        var userId = _currentUser.GetId();
        var def = await _defs.FindAsync(goalId, userId, ct) ?? throw new BusinessException("Workspace:GoalNotFound");

        var prog = await GetOrCreateProgressAsync(def.Id, d, ct);

        prog.SetChecked(input.IsChecked);
        await EnsureAutoCheckInIfAllGoalsCompletedAsync(d, ct);

        await _dailys.UpdateAsync(prog, true, ct);

        return await GetProgressAsync(d, ct);
    }


    [HttpGet("/api/app/workspace/today/summary")]
    public virtual async Task<TodaySummaryDto> GetSummaryAsync([FromQuery] DateTime? date = null, CancellationToken ct = default)
    {
        var d = (date ?? _clock.Now).Date;
        var pairs = await GetOrBuildProgressAsync(d, ct);

        var total = pairs.Count;
        var completed = pairs.Count(x => x.Prog?.IsChecked ?? true);
        var ratio = total <= 0 ? 0 : (double)completed / total;

        return new TodaySummaryDto
        {
            Date = d,
            TotalGoals = total,
            CompletedGoals = completed,
            ProgressRatio = ratio
        };
    }
    
    private async Task<List<(GoalDefinition Def, GoalDailyProgress? Prog)>> GetOrBuildProgressAsync(DateTime date, CancellationToken ct)
    {
        var userId = _currentUser.GetId();
        var defs = await _defs.GetActiveListAsync(userId, ct);
        var progs = await _dailys.GetByDateAsync(userId, date, ct);

        var dict = progs.ToDictionary(x => x.GoalId, x => x);
        var list = new List<(GoalDefinition, GoalDailyProgress?)>(defs.Count);

        foreach (var def in defs)
        {
            dict.TryGetValue(def.Id, out var p);
            list.Add((def, p));
        }

        return list;
    }
    
    private async Task EnsureAutoCheckInIfAllGoalsCompletedAsync(DateTime date, CancellationToken ct)
    {
        var pairs = await GetOrBuildProgressAsync(date, ct);
        var total = pairs.Count;
        if (total <= 0) return;

        var completed = pairs.Count(x => x.Prog?.IsChecked ?? true);
        if (completed == total)
        {
            var userId = _currentUser.GetId();
            var existing = await _checks.FindAsync(userId, true, ct);
            if (existing != null) return;

            var entity = new CheckIn( "goal");
            await _checks.InsertAsync(entity, autoSave: true, ct);
        }
    }
    
    private async Task<GoalDailyProgress> GetOrCreateProgressAsync(Guid goalId, DateTime date, CancellationToken ct)
    {
        var userId = _currentUser.GetId();
        var existing = await _dailys.FindAsync(userId, goalId, date, ct);
        if (existing != null) return existing;

        var created = new GoalDailyProgress(goalId, date);
        await _dailys.InsertAsync(created, autoSave: true, ct);
        return created;
    }
}
