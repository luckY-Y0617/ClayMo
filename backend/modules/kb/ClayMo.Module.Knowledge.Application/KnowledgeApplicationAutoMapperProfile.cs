using AutoMapper;
using ClayMo.Module.Knowledge.Application.Contracts.Comments.Dtos;
using ClayMo.Module.Knowledge.Application.Contracts.KnowledgeBases.Dtos;
using ClayMo.Module.Knowledge.Application.Contracts.Documents.Dtos;
using ClayMo.Module.Knowledge.Application.Contracts.Members.Dtos;
using ClayMo.Module.Knowledge.Application.Contracts.Tags.Dtos;
using ClayMo.Module.Knowledge.Application.Contracts.Versions.Dtos;
using ClayMo.Module.Knowledge.Domain.Comments;
using ClayMo.Module.Knowledge.Domain.Documents;
using ClayMo.Module.Knowledge.Domain.KnowledgeBases;
using ClayMo.Module.Knowledge.Domain.Members;
using ClayMo.Module.Knowledge.Domain.Tags;
using ClayMo.Module.Knowledge.Domain.Versions;


namespace ClayMo.Module.Knowledge.Application
{
    public class KnowledgeApplicationAutoMapperProfile : Profile
    {
        public KnowledgeApplicationAutoMapperProfile()
        {
            CreateMap<KnowledgeBase, KnowledgeBaseDto>();

            CreateMap<Document, DocumentDto>();

            CreateMap<Document, DocumentTreeNodeDto>();

            CreateMap<Document, DocumentMetaDto>();

            CreateMap<Document, DocumentDetailDto>()
                .ForMember(d => d.Content, opt => opt.Ignore())
                .ForMember(d => d.Tags, opt => opt.Ignore());

            CreateMap<Document, DocumentBreadcrumbItemDto>()
                .ForMember(d => d.Title, opt => opt.MapFrom(s => s.Title));

            CreateMap<DocumentVersion, DocumentVersionDto>();
            
            CreateMap<KnowledgeBaseMember, KnowledgeBaseMemberDto>();

            CreateMap<Tag, TagDto>();

            CreateMap<Comment, CommentDto>();
        }
    }
}
