using System.ComponentModel.DataAnnotations;
using ClayMo.Module.Identity.Domain.Shared.Consts;
using ClayMo.Module.Identity.Domain.Shared.Enums;
namespace ClayMo.Module.Identity.Application.Contracts.Roles.Dtos;

public class RoleUpdateDto
{

    [Required]
    [StringLength(RoleConsts.RoleNameMaxLength)]
    public string RoleName { get; set; } = string.Empty;

    [StringLength(RoleConsts.DescriptionMaxLength)]
    public string? Description { get; set; }

}


