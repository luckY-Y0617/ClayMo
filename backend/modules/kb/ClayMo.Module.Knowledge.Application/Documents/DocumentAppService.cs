using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClayMo.Framework.Authorization.AspNetCore;
using ClayMo.Framework.SqlSugar.Abstractions;
using ClayMo.Module.Knowledge.Application.Contracts.Documents;
using ClayMo.Module.Knowledge.Application.Contracts.Documents.Dtos;
using ClayMo.Module.Knowledge.Application.Contracts.Tags.Dtos;
using ClayMo.Module.Knowledge.Domain.Documents;
using ClayMo.Module.Knowledge.Domain.KnowledgeBases;
using ClayMo.Module.Knowledge.Domain.Shared.Authorization;
using ClayMo.Module.Knowledge.Domain.Shared.Enums;
using ClayMo.Module.Knowledge.Domain.Tags;
using ClayMo.Module.Workspace.Domain.Shared.Activity.Events;
using ClayMo.Module.Knowledge.Domain.Shared.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.EventBus.Local;

namespace ClayMo.Module.Knowledge.Application.Documents;

[Authorize]
[ApiController]
[Route("/api/app/kbs/{baseId:guid}/documents")]
public class DocumentAppService : ApplicationService, IDocumentAppService
{
    private readonly IKnowledgeBaseRepository _knowledgeBaseRepository;
    private readonly IDocumentRepository _documentRepository;
    private readonly ISqlSugarRepository<DocumentContent, Guid> _contentRepository;

    private readonly DocumentManager _documentManager;
    private readonly DocumentContentManager _documentContentManager;
    private readonly ILocalEventBus _localEventBus;

    public DocumentAppService(
        IKnowledgeBaseRepository knowledgeBaseRepository,
        IDocumentRepository documentRepository,
        ISqlSugarRepository<DocumentContent, Guid> contentRepository,
        DocumentManager documentManager,
        DocumentContentManager documentContentManager,
        ILocalEventBus localEventBus)
    {
        _knowledgeBaseRepository = knowledgeBaseRepository;
        _documentRepository = documentRepository;
        _contentRepository = contentRepository;
        _documentManager = documentManager;
        _documentContentManager = documentContentManager;
        _localEventBus = localEventBus;
    }

    #region Tree & Basic Info
    
    [HttpGet("{docId:guid}")]
    [RequirePermission(KnowledgePermissions.Document.View)]
    public virtual async Task<DocumentMetaDto> GetAsync([FromRoute] Guid baseId, [FromRoute] Guid docId)
    {
        var doc = await _documentRepository.GetAsync(docId, includeDetails: true);

        if (doc == null || doc.IsDeleted)
        {
            throw new EntityNotFoundException(typeof(Document), docId);
        }

        if (doc.KnowledgeBaseId != baseId)
        {
            throw new EntityNotFoundException(typeof(Document), docId);
        }

        var commentCount = await _documentRepository.GetCommentCountAsync(docId);
        var versionCount = await _documentRepository.GetVersionCountAsync(docId);

        var dto = ObjectMapper.Map<Document, DocumentMetaDto>(doc);

        dto.CommentCount = commentCount;
        dto.VersionCount = versionCount;

        if (doc.Tags?.Count > 0)
        {
            dto.Tags = ObjectMapper.Map<List<Tag>, List<TagDto>>(doc.Tags);
        }

        return dto;
    }


    [HttpGet("tree")]
    [RequirePermission(KnowledgePermissions.Document.View)]
    public virtual async Task<List<DocumentTreeNodeDto>> GetTreeAsync([FromRoute] Guid baseId)
    {
        var docs = await _documentRepository.GetTreeAsync(baseId);

        return BuildDocumentTree(docs);
    }

    [HttpGet("children")]
    [RequirePermission(KnowledgePermissions.Document.View)]
    public virtual async Task<List<DocumentDto>> GetChildrenAsync([FromRoute] Guid baseId, [FromQuery] Guid? parentId)
    {
        var docs = await _documentRepository.GetChildrenAsync(baseId, parentId);
        return ObjectMapper.Map<List<Document>, List<DocumentDto>>(docs);
    }

    #endregion

    private List<DocumentTreeNodeDto> BuildDocumentTree(IEnumerable<Document> docs)
    {
        var docList = docs.ToList();
        var lookup = docList.ToLookup(d => d.ParentId);

        List<DocumentTreeNodeDto> BuildChildren(Guid? parentId)
        {
            return lookup[parentId]
                .OrderBy(d => d.Order)
                .Select(d =>
                {
                    var node = ObjectMapper.Map<Document, DocumentTreeNodeDto>(d);
                    node.Children = BuildChildren(d.Id);
                    return node;
                })
                .ToList();
        }

        return BuildChildren(null);
    }

    #region CRUD
    
    [HttpPost]
    [RequirePermission(KnowledgePermissions.Document.Create)]
    public virtual async Task<DocumentDto> CreateAsync(
        [FromRoute] Guid baseId,
        [FromBody] DocumentCreateDto input)
    {
        var kb = await _knowledgeBaseRepository.FindAsync(baseId, false);

        if (kb == null)
        {
            throw new EntityNotFoundException(typeof(KnowledgeBase), baseId);
        }
        
        var document = await _documentManager.CreateAsync(
            knowledgeBaseId: baseId,
            title: input.Title,
            parentId: input.ParentId,
            type: input.Type,
            initialContentJson: input.InitialContentJson);
        
        await _localEventBus.PublishAsync(
            new DocumentCreatedActivityEvent(
                DocumentId: document.Id,
                KnowledgeBaseId: document.KnowledgeBaseId,
                ParentId: document.ParentId,
                Title: document.Title,
                Order: document.Order,
                TeamId: kb.TeamId // 或者 doc.TeamId（看你实体放哪里）
            ));
        
        return ObjectMapper.Map<Document, DocumentDto>(document);
    }


    [HttpPut("{id:guid}/rename")]
    [RequirePermission(KnowledgePermissions.Document.Edit)]
    public virtual async Task<DocumentDto> RenameAsync(
        [FromRoute] Guid baseId,
        [FromRoute] Guid id,
        [FromBody] DocumentRenameDto input)
    {
        var doc = await _documentRepository.GetAsync(id, includeDetails: false);
        if (doc == null || doc.IsDeleted)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        if (doc.KnowledgeBaseId != baseId)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        await _documentManager.RenameAsync(doc, input.Title);

        return ObjectMapper.Map<Document, DocumentDto>(doc);
    }

    /// <summary>
    /// PUT /api/kbs/{baseId}/documents/{id}/move
    /// </summary>
    [HttpPut("{id:guid}/move")]
    [RequirePermission(KnowledgePermissions.Document.Move)]
    public virtual async Task<DocumentDto> MoveAsync(
        [FromRoute] Guid baseId,
        [FromRoute] Guid id,
        [FromBody] DocumentMoveDto input)
    {
        Check.NotNull(input, nameof(input));

        if (input.Id != Guid.Empty && input.Id != id)
        {
            throw new AbpException("Route id mismatch with body.Id.");
        }

        var doc = await _documentRepository.GetAsync(id, includeDetails: false);
        if (doc == null || doc.IsDeleted)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        if (doc.KnowledgeBaseId != baseId)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        await _documentManager.MoveAsync(doc, input.NewParentId, input.NewOrder);

        return ObjectMapper.Map<Document, DocumentDto>(doc);
    }

    /// <summary>
    /// DELETE /api/kbs/{baseId}/documents/{id}?includeChildren=true
    /// </summary>
    [HttpDelete("{id:guid}")]
    [RequirePermission(KnowledgePermissions.Document.Delete)]
    public virtual async Task DeleteAsync(
        [FromRoute] Guid baseId,
        [FromRoute] Guid id,
        [FromQuery] bool includeChildren = false)
    {
        var doc = await _documentRepository.GetAsync(id, includeDetails: false);
        if (doc == null || doc.IsDeleted)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        if (doc.KnowledgeBaseId != baseId)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        var kb = await _knowledgeBaseRepository.FindAsync(baseId, false);
        var docTitle = doc.Title;

        await _documentManager.DeleteAsync(doc, includeChildren);

        // 发布文档删除活动事件
        await _localEventBus.PublishAsync(
            new DocumentDeletedActivityEvent(
                DocumentId: id,
                KnowledgeBaseId: baseId,
                Title: docTitle,
                TeamId: kb?.TeamId
            ));
    }

    #endregion

    #region Content

    [HttpGet("{id:guid}/content")]
    [RequirePermission(KnowledgePermissions.Document.View)]
    public virtual async Task<DocumentContentDto?> GetContentAsync(
        [FromRoute] Guid baseId,
        [FromRoute] Guid id)
    {
        // 安全一致性：先验证 doc 属于 baseId（否则可越权读取别的 KB 的内容）
        var doc = await _documentRepository.GetAsync(id, includeDetails: false);
        if (doc == null)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        if (doc.KnowledgeBaseId != baseId)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        var content = await _contentRepository.FindAsync(x => x.Id == id, includeDetails: false);
        if (content == null)
        {
            return null;
        }

        return new DocumentContentDto
        {
            DocumentId = content.Id,
            ContentJson = content.ContentJson,
            ContentHtml = content.ContentHtml,
        };
    }

    [HttpPut("{id:guid}/content")]
    [RequirePermission(KnowledgePermissions.Document.Edit)]
    public virtual async Task SaveContentAsync(
        [FromRoute] Guid baseId,
        [FromRoute] Guid id,
        [FromBody] SaveDocumentContentInput input)
    {
        Check.NotNull(input, nameof(input));
        Check.NotNullOrWhiteSpace(input.ContentJson, nameof(input.ContentJson));

        if (input.Id != Guid.Empty && input.Id != id)
        {
            throw new AbpException("Route id mismatch with body.Id.");
        }

        var doc = await _documentRepository.GetAsync(id, includeDetails: false);
        if (doc == null || doc.IsDeleted)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        if (doc.KnowledgeBaseId != baseId)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        // ✅ 这里保持你原本逻辑：AutoSave / ManualSave
        var source = input.IsAutoSave
            ? DocumentVersionSource.AutoSave
            : DocumentVersionSource.ManualSave;

        await _documentContentManager.SaveContentAsync(
            doc,
            contentJson: input.ContentJson,
            contentHtml: input.ContentHtml,
            plainText: input.PlainText,
            versionSource: source,
            changeSummary: input.ChangeSummary);

        // 仅手动保存时发布文档更新活动事件（避免自动保存产生过多记录）
        if (!input.IsAutoSave)
        {
            var kb = await _knowledgeBaseRepository.FindAsync(baseId, false);
            await _localEventBus.PublishAsync(
                new DocumentUpdatedActivityEvent(
                    DocumentId: doc.Id,
                    KnowledgeBaseId: baseId,
                    Title: doc.Title,
                    ChangeSummary: input.ChangeSummary,
                    TeamId: kb?.TeamId
                ));
        }
    }

    #endregion

    #region Breadcrumb

    /// <summary>
    /// GET /api/kbs/{baseId}/documents/{id}/breadcrumb
    /// </summary>
    [HttpGet("{id:guid}/breadcrumb")]
    [RequirePermission(KnowledgePermissions.Document.View)]
    public virtual async Task<List<DocumentBreadcrumbItemDto>> GetBreadcrumbAsync(
        [FromRoute] Guid baseId,
        [FromRoute] Guid id)
    {
        // 同样做一致性验证（避免越权）
        var doc = await _documentRepository.GetAsync(id, includeDetails: false);
        if (doc == null || doc.IsDeleted)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        if (doc.KnowledgeBaseId != baseId)
        {
            throw new EntityNotFoundException(typeof(Document), id);
        }

        var docs = await _documentRepository.GetBreadcrumbAsync(id);
        return docs
            .Select(d => new DocumentBreadcrumbItemDto
            {
                Id = d.Id,
                Title = d.Title
            })
            .ToList();
    }

    #endregion
}
