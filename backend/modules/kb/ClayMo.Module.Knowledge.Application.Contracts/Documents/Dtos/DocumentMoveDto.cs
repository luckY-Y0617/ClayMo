using System;
using Volo.Abp.Application.Dtos;

namespace ClayMo.Module.Knowledge.Application.Contracts.Documents.Dtos;

public class DocumentMoveDto : EntityDto<Guid>
{
    public Guid? NewParentId { get; set; }
    public int NewOrder { get; set; }
}