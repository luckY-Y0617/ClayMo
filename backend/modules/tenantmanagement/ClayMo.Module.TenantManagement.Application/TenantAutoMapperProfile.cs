using AutoMapper;
using ClayMo.Module.TenantManagement.Application.Contracts.Dtos;
using ClayMo.Module.TenantManagement.Domain;

namespace ClayMo.Module.TenantManagement.Application;

public class TenantAutoMapperProfile : Profile
{
    public TenantAutoMapperProfile()
    {
        CreateMap<TenantAggregateRoot, TenantGetOutputDto>()
            .ForMember(d => d.DbType, opt => opt.MapFrom(s => s.DbType));

        CreateMap<TenantAggregateRoot, TenantGetListOutputDto>()
            .ForMember(d => d.DbType, opt => opt.MapFrom(s => s.DbType));

        CreateMap<TenantConnectionString, TenantConnectionStringDto>();
    }
}