using System;

namespace ClayMo.Module.Knowledge.Application.Contracts.Versions.Dtos;

public class RestoreDocumentVersionInput
{
    public Guid DocumentId { get; set; }
    public Guid VersionId { get; set; }
}