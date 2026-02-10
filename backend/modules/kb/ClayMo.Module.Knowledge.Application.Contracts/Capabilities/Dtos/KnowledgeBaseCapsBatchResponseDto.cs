using System.Collections.Generic;

namespace ClayMo.Module.Knowledge.Application.Contracts.Capabilities.Dtos;

public class KnowledgeBaseCapsBatchResponseDto
{
    public List<KnowledgeBaseCapsDto> Items { get; set; } = new();
}