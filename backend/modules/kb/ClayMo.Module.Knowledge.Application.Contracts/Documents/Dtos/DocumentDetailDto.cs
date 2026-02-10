using System.Collections.Generic;
using ClayMo.Module.Knowledge.Application.Contracts.Tags.Dtos;

namespace ClayMo.Module.Knowledge.Application.Contracts.Documents.Dtos;

/// <summary>
/// 文档详情（含内容 + 标签 + 基本信息）
/// 对应前端 GET /api/documents/:id?includeContent=true
/// </summary>
public class DocumentDetailDto : DocumentDto
{
    public DocumentContentDto? Content { get; set; }
    public List<TagDto> Tags { get; set; } = new();
}