using ClayMo.Module.Knowledge.Domain.Shared.Enums;

namespace ClayMo.Module.Knowledge.Application.Contracts.Members.Dtos;

/// <summary>
/// 修改成员角色输入
/// </summary>
public class KnowledgeBaseMemberUpdateRoleDto
{
    public KnowledgeBaseMemberRole Role { get; set; }
}