using ClayMo.Module.Workspace.Application.Contracts.Focus;
using ClayMo.Module.Workspace.Application.Contracts.Focus.Dtos;
using ClayMo.Module.Workspace.Domain.Focus;
using ClayMo.Module.Workspace.Domain.Shared.Activity.Events;
using ClayMo.Module.Workspace.Domain.Shared.Focus;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.Application.Services;
using Volo.Abp.EventBus.Local;
using Volo.Abp.MultiTenancy;
using Volo.Abp.Timing;
using Volo.Abp.Users;

namespace ClayMo.Module.Workspace.Application.Focus;

[Authorize]
[ApiController]
[Route("/api/app/workspace/focus")]
public class FocusAppService : ApplicationService, IFocusAppService
{
    private readonly IFocusSessionRepository _sessionRepo;
    private readonly IFocusSegmentRepository _segmentRepo;
    private readonly IClock _clock;
    private readonly ICurrentUser _currentUser;
    private readonly ICurrentTenant _currentTenant;
    private readonly ILocalEventBus _localEventBus;

    public FocusAppService(
        IFocusSessionRepository sessionRepo,
        IFocusSegmentRepository segmentRepo,
        IClock clock,
        ICurrentUser currentUser,
        ICurrentTenant currentTenant,
        ILocalEventBus localEventBus)
    {
        _sessionRepo = sessionRepo;
        _segmentRepo = segmentRepo;
        _clock = clock;
        _currentUser = currentUser;
        _currentTenant = currentTenant;
        _localEventBus = localEventBus;
    }

    [HttpPost("start")]
    public virtual async Task<FocusSessionDto> StartAsync([FromBody] FocusStartInput input, CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();

        // 幂等：同 id 已存在则直接返回
        var existing = await _sessionRepo.FindAsync(input.Id, ct);
        if (existing != null)
        {
            var runningSeg = await _segmentRepo.FindRunningSegmentAsync(existing.Id, ct);
            return ToDto(existing, runningSeg?.StartAt);
        }

        var now = _clock.Now;

        var session = new FocusSession(
            id: input.Id,
            tenantId: _currentTenant.Id,
            userId: userId,
            plannedSeconds: input.PlannedSeconds,
            startAt: now,
            title: input.Title);

        await _sessionRepo.InsertAsync(session, autoSave: true, ct);

        // 创建第一段 segment
        var seg = new FocusSegment(Guid.NewGuid(), _currentTenant.Id, session.Id, now);
        await _segmentRepo.InsertAsync(seg, autoSave: true, ct);

        return ToDto(session, seg.StartAt);
    }

    [HttpPost("{id:guid}/pause")]
    public virtual async Task<FocusSessionDto> PauseAsync(Guid id, CancellationToken ct = default)
    {
        var session = await MustGetSessionOwnedByCurrentUserAsync(id, ct);

        // 幂等：如果已经 paused/completed/canceled，直接返回
        if (session.Status != FocusSessionStatus.Running)
        {
            var runningSeg0 = await _segmentRepo.FindRunningSegmentAsync(session.Id, ct);
            return ToDto(session, runningSeg0?.StartAt);
        }

        var now = _clock.Now;

        var runningSeg = await _segmentRepo.FindRunningSegmentAsync(session.Id, ct);
        if (runningSeg != null)
        {
            var seconds = runningSeg.Finish(now);
            await _segmentRepo.UpdateAsync(runningSeg, autoSave: true, ct);
            session.AddActualSeconds(seconds);
        }

        session.MarkPaused();
        await _sessionRepo.UpdateAsync(session, autoSave: true, ct);

        return ToDto(session, null);
    }

    [HttpPost("{id:guid}/resume")]
    public virtual async Task<FocusSessionDto> ResumeAsync(Guid id, CancellationToken ct = default)
    {
        var session = await MustGetSessionOwnedByCurrentUserAsync(id, ct);

        // Completed/Canceled 不可 resume
        if (session.Status == FocusSessionStatus.Completed || session.Status == FocusSessionStatus.Canceled)
            throw new Volo.Abp.BusinessException("Workspace:FocusSessionNotResumable");

        // 幂等：如果已经 Running 且存在 running segment，直接返回
        var runningSeg = await _segmentRepo.FindRunningSegmentAsync(session.Id, ct);
        if (session.Status == FocusSessionStatus.Running && runningSeg != null)
        {
            return ToDto(session, runningSeg.StartAt);
        }

        var now = _clock.Now;

        // 确保没有 running segment（如果有则视为幂等/脏数据修复）
        if (runningSeg == null)
        {
            var seg = new FocusSegment(Guid.NewGuid(), _currentTenant.Id, session.Id, now);
            await _segmentRepo.InsertAsync(seg, autoSave: true, ct);
            runningSeg = seg;
        }

        session.MarkRunning();
        await _sessionRepo.UpdateAsync(session, autoSave: true, ct);

        return ToDto(session, runningSeg.StartAt);
    }

    [HttpPost("{id:guid}/finish")]
    public virtual async Task<FocusSessionDto> FinishAsync(Guid id, CancellationToken ct = default)
    {
        var session = await MustGetSessionOwnedByCurrentUserAsync(id, ct);

        if (session.Status == FocusSessionStatus.Completed)
        {
            var runningSeg0 = await _segmentRepo.FindRunningSegmentAsync(session.Id, ct);
            return ToDto(session, runningSeg0?.StartAt);
        }

        var now = _clock.Now;

        // 结束 running segment（如果存在）
        var runningSeg = await _segmentRepo.FindRunningSegmentAsync(session.Id, ct);
        if (runningSeg != null)
        {
            var seconds = runningSeg.Finish(now);
            await _segmentRepo.UpdateAsync(runningSeg, autoSave: true, ct);
            session.AddActualSeconds(seconds);
        }

        session.MarkCompleted(now);
        await _sessionRepo.UpdateAsync(session, autoSave: true, ct);

        // 发布专注完成活动事件
        await _localEventBus.PublishAsync(
            new FocusCompletedActivityEvent(
                SessionId: session.Id,
                Title: session.Title,
                PlannedSeconds: session.PlannedSeconds,
                ActualSeconds: session.ActualSeconds,
                TeamId: null // 专注暂无 TeamId
            ));

        return ToDto(session, null);
    }

    [HttpPost("{id:guid}/cancel")]
    public virtual async Task<FocusSessionDto> CancelAsync(Guid id, CancellationToken ct = default)
    {
        var session = await MustGetSessionOwnedByCurrentUserAsync(id, ct);

        if (session.Status == FocusSessionStatus.Canceled)
        {
            var runningSeg0 = await _segmentRepo.FindRunningSegmentAsync(session.Id, ct);
            return ToDto(session, runningSeg0?.StartAt);
        }

        var now = _clock.Now;

        var runningSeg = await _segmentRepo.FindRunningSegmentAsync(session.Id, ct);
        if (runningSeg != null)
        {
            var seconds = runningSeg.Finish(now);
            await _segmentRepo.UpdateAsync(runningSeg, autoSave: true, ct);

            // 取消是否计入专注时长：默认计入（更贴合“我专注过”）
            session.AddActualSeconds(seconds);
        }

        session.MarkCanceled(now);
        await _sessionRepo.UpdateAsync(session, autoSave: true, ct);

        return ToDto(session, null);
    }

    [HttpGet("current")]
    public virtual async Task<FocusSessionDto?> GetCurrentAsync(CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();

        var session = await _sessionRepo.FindCurrentAsync(userId, ct);
        if (session == null) return null;

        var runningSeg = await _segmentRepo.FindRunningSegmentAsync(session.Id, ct);
        return ToDto(session, runningSeg?.StartAt);
    }

    [HttpGet("stats/today")]
    public virtual async Task<FocusTodayStatsDto> GetTodayStatsAsync(CancellationToken ct = default)
    {
        var userId = _currentUser.GetId();

        // MVP：按“今天开始时间”统计 session.StartAt 在今天的
        // 更严谨：按 segment 的时间切片统计（可后续优化）
        var today = _clock.Now.Date;
        var tomorrow = today.AddDays(1);

        // 这里我用 repo.GetSugarQueryableAsync() 最简单直接；如果你不希望暴露 query，
        // 我可以再帮你封装成仓储方法。
        var q = await _sessionRepo.GetQueryableAsync();

        q = q.Where(x => x.UserId == userId)
             .Where(x => x.StartAt >= today && x.StartAt < tomorrow);

        var list = await q.ToListAsync(ct);

        var focusMinutes = (int)Math.Floor(list.Sum(x => x.ActualSeconds) / 60.0);
        var completed = list.Count(x => x.Status == FocusSessionStatus.Completed);

        return new FocusTodayStatsDto
        {
            FocusMinutes = focusMinutes,
            CompletedPomodoros = completed
        };
    }

    private async Task<FocusSession> MustGetSessionOwnedByCurrentUserAsync(Guid id, CancellationToken ct)
    {
        var session = await _sessionRepo.FindAsync(id, ct);
        if (session == null)
            throw new Volo.Abp.BusinessException("Workspace:FocusSessionNotFound");

        if (session.UserId != _currentUser.GetId())
            throw new Volo.Abp.BusinessException("Workspace:FocusSessionNotOwned");

        return session;
    }

    private static FocusSessionDto ToDto(FocusSession s, DateTime? runningSegmentStartAt)
        => new()
        {
            Id = s.Id,
            UserId = s.UserId,
            Status = s.Status.ToString(),
            PlannedSeconds = s.PlannedSeconds,
            ActualSeconds = s.ActualSeconds,
            StartAt = s.StartAt,
            EndAt = s.EndAt,
            Title = s.Title,
            RunningSegmentStartAt = runningSegmentStartAt
        };
}
