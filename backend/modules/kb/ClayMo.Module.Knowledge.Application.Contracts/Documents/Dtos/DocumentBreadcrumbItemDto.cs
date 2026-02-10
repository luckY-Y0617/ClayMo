using System;
using Volo.Abp.Application.Dtos;

namespace ClayMo.Module.Knowledge.Application.Contracts.Documents.Dtos;

public class DocumentBreadcrumbItemDto : EntityDto<Guid>
{
    public string Title { get; set; } = default!;
}