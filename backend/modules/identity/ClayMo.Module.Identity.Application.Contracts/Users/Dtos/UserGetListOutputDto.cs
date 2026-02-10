using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace ClayMo.Module.Identity.Application.Contracts.Users.Dtos;

public class UserGetListOutputDto : PagedResultDto<UserDto>
{
    public UserGetListOutputDto()
    {
    }

    public UserGetListOutputDto(long totalCount, IReadOnlyList<UserDto> items) : base(totalCount, items)
    {
    }
}


