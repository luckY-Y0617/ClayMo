using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ClayMo.Module.Knowledge.Application.Contracts.Capabilities.Dtos;

public class KnowledgeBaseCapsBatchRequestDto
{
    [Required]
    public List<Guid> KnowledgeBaseIds { get; set; } = new();
}