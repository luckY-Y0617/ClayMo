using AutoMapper;
using ClayMo.Module.Workspace.Application.Contracts.Activity.Dtos;
using ClayMo.Module.Workspace.Application.Contracts.Goal.Dtos;
using ClayMo.Module.Workspace.Domain.Activity;
using ClayMo.Module.Workspace.Domain.Goal;

namespace ClayMo.Module.Workspace.Application;

public class WorkSpaceApplicationAutoMapperProfile: Profile
{
    public WorkSpaceApplicationAutoMapperProfile()
    {
        CreateMap<GoalDefinition, GoalDefinitionDto>();

        CreateMap<WeeklyFocusItem, GoalProgressItemDto>();

        CreateMap<ActivityLog, ActivityDto>();
    }
}