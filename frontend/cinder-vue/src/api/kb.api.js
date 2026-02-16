import http from '@/utils/http'

export const kbApi = {
  /* -------------------- 知识库（Knowledge Base） -------------------- */
  kb: {

    list(params = {}) {
      return http.get('api/kbs', {
        params: {
          filter: null,
          visibility: null,
          sorting: null,
          skipCount: 0,
          maxResultCount: 20,
          ...params,
        },
      })
    }
    ,

    getContext(id) {
      return http.get(`/api/kbs/${id}`)
    },

    create(data) {
      return http.post('/api/kbs', data)
    },

    update(id, data) {
      return http.put(`/api/kbs/${id}`, data)
    },

    delete(id) {
      return http.delete(`/api/kbs/${id}`)
    },
  },
  /* -------------------- 文档结构 / 搜索 -------------------- */
  document: {

    get(baseId, docId) {
      return http.get(`/api/kbs/${baseId}/documents/${docId}`)
    },

    getTree(baseId) {
      return http.get(`/api/kbs/${baseId}/documents/tree/`)
    },

    create(baseId,data) {
      return http.post(`/api/kbs/${baseId}/documents`, {
        knowledgeBaseId: data.knowledgeBaseId,
        parentId: data.parentId || null,
        title: data.title,
        type: data.type || 'Normal',
        initialContentJson: data.initialContentJson || null,
      })
    },

    rename(baseId, docId, data) {
      return http.put(`/api/kbs/${baseId}/documents/${docId}/rename`, data)
    },

    delete(baseId, docId, includeChildren = false) {
      return http.delete(`/api/kbs/${baseId}/documents/${docId}`, {
        params: { includeChildren }
      })
    },

    content: {
      get(baseId, docId) {
        return http.get(`/api/kbs/${baseId}/documents/${docId}/content`)
      },


      save(baseId, docId, data) {
        return http.put(`/api/kbs/${baseId}/documents/${docId}/content`, data)
      },
    },

    version: {

      list(baseId, docId) {
        return http.get(`/api/kbs/${baseId}/documents/${docId}/versions`)
      },

      restore(baseId, docId, versionId) {
        return http.post(`/api/kbs/${baseId}/documents/${docId}/versions/${versionId}/restore`)
      },
    },

    /**
     * 移动文档到新的父节点
     * PUT /api/kbs/{baseId}/documents/{docId}/move
     * body: { parentId: string|null }
     */
    move(baseId, docId, data) {
      return http.put(`/api/kbs/${baseId}/documents/${docId}/move`, data)
    },

    tag: {

      list(baseId, params = {}) {
        return http.get(`/api/kbs/${baseId}/tags`, {
          params: {
            ...params, 
          },
        })
      },

      get(id) {
        return http.get(`/api/app/tag/${id}`)
      },

      create(data) {
        return http.post('/api/app/tag', data)
      },

      update(id, data) {
        return http.put(`/api/app/tag/${id}`, data)
      },

      delete(id) {
        return http.delete(`/api/app/tag/${id}`)
      },

      setDocumentTags(documentId, tagIds) {
        return http.post('/api/app/document/tags', {
          documentId,
          tagIds,
        })
      },
    },

    comment: {
      /**
       * 获取文档的评论列表
       * GET /api/kbs/{baseId}/documents/{documentId}/comments
       */
      async getList(baseId, documentId) {
        return http.get(`/api/kbs/${baseId}/documents/${documentId}/comments`)
      },
    
      async create(baseId, documentId, body) {
        const {
          content,
          parentId = null,
          position = null,
        } = body
      
        const requestPayload = {
          content,
          parentId,
          position, // ✅ 原样透传，不做任何拆解/重组
        }
      
        return http.post(
          `/api/kbs/${baseId}/documents/${documentId}/comments`,
          requestPayload
        )
      },
      
    
      /**
       * 删除评论
       * DELETE /api/kbs/{baseId}/documents/{documentId}/comments/{id}
       */
      async remove(baseId, documentId, commentId) {
        return http.delete(`/api/kbs/${baseId}/documents/${documentId}/comments/${commentId}`)
      },
    
      /**
       * 点赞 / 取消点赞
       * POST /api/kbs/{baseId}/documents/{documentId}/comments/{id}/like
       * 返回最新的 likeCount / likedByCurrentUser
       */
      async toggleLike(baseId, documentId, commentId) {
        return http.post(`/api/kbs/${baseId}/documents/${documentId}/comments/${commentId}/like`)
      },
    
      /**
       * 解决评论（标记为已解决）
       * POST /api/kbs/{baseId}/documents/{documentId}/comments/{id}/resolve
       */
      async resolve(baseId, documentId, commentId) {
        return http.post(`/api/kbs/${baseId}/documents/${documentId}/comments/${commentId}/resolve`)
      },
    
      /**
       * 重新打开评论（取消已解决状态）
       * POST /api/kbs/{baseId}/documents/{documentId}/comments/{id}/reopen
       */
      async reopen(baseId, documentId, commentId) {
        return http.post(`/api/kbs/${baseId}/documents/${documentId}/comments/${commentId}/reopen`)
      }
    }
  },

  members: {
    /**
     * 获取知识库成员列表
     * GET /api/kbs/{baseId}/members
     */
    list(baseId) {
      return http.get(`/api/kbs/${baseId}/members`)
    },

    /**
     * 添加或更新知识库成员
     * PUT /api/kbs/{baseId}/members
     */
    addOrUpdate(baseId, payload) {
      return http.put(`/api/kbs/${baseId}/members`, payload)
    },

    /**
     * 修改成员角色
     * PUT /api/kbs/{baseId}/members/{userId}/role
     */
    changeRole(baseId, userId, role) {
      return http.put(`/api/kbs/${baseId}/members/${userId}/role`, { role })
    },

    /**
     * 移除知识库成员
     * DELETE /api/kbs/{baseId}/members/{userId}
     */
    remove(baseId, userId) {
      return http.delete(`/api/kbs/${baseId}/members/${userId}`)
    },
  },
}
