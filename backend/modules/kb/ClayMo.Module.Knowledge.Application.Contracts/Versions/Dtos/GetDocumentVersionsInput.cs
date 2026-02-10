using System;
using Volo.Abp.Application.Dtos;

namespace ClayMo.Module.Knowledge.Application.Contracts.Versions.Dtos;

public class GetDocumentVersionsInput : PagedAndSortedResultRequestDto
{
    public Guid DocumentId { get; set; }
}