using System.ComponentModel.DataAnnotations;

namespace ClayMo.Module.Identity.Application.Contracts.identities.Dtos;

public class RefreshTokenInputDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}


