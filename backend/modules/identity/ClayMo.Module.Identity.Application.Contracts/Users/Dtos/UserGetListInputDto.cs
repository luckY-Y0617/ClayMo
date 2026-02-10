using Volo.Abp.Application.Dtos;

namespace ClayMo.Module.Identity.Application.Contracts.Users.Dtos;

public class UserGetListInputDto : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }
}


