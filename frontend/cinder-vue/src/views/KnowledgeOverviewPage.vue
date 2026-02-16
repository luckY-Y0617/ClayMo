<template>
  <div class="kb-overview-page">
    <!-- 顶部导航栏 -->
    <header class="top-header">
            <div class="header-left">
        <router-link to="/" class="back-home-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </router-link>
        <h1 class="page-title">知识空间</h1>
            </div>
      
      <!-- 文档/管理 切换器 -->
      <div class="mode-switcher">
        <button
          class="mode-tab"
          :class="{ active: viewMode === 'docs' }"
          @click="switchMode('docs')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>文档</span>
        </button>
        <button
          class="mode-tab"
          :class="{ active: viewMode === 'manage' }"
          @click="switchMode('manage')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>管理</span>
        </button>
      </div>
      
      <div class="header-right">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            placeholder="搜索文档..."
            @keyup.enter="handleSearch"
          />
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧面板 -->
      <aside class="side-panel">
        <!-- 团队切换区 -->
        <div class="team-section" v-if="teamStore.loaded">
          <div class="section-label">空间</div>
          <div class="team-list">
            <button
              class="team-item"
              :class="{ active: !teamStore.isTeamMode }"
              @click="selectPersonal"
            >
              <span class="team-icon">👤</span>
              <span class="team-name">个人</span>
              <svg v-if="!teamStore.isTeamMode" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button
              v-for="team in teamStore.teams"
              :key="team.id || team.teamId"
              class="team-item"
              :class="{ active: teamStore.currentTeamId === (team.id || team.teamId) }"
              @click="selectTeam(team.id || team.teamId)"
            >
              <span class="team-icon">👥</span>
              <span class="team-name">{{ team.name || team.displayName || '团队' }}</span>
              <svg v-if="teamStore.currentTeamId === (team.id || team.teamId)" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- 文档模式：知识库列表 -->
        <div v-if="viewMode === 'docs'" class="kb-section">
          <div class="section-header">
            <span class="section-label">知识库</span>
            <button v-if="hasCreateKbPermission" class="create-btn" @click="openCreateBaseModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          
          <div class="kb-list">
            <div
              v-for="base in bases"
              :key="base.id"
              class="kb-item"
              :class="{ active: base.id === currentBaseId }"
              @click="handleBaseSelect(base.id)"
            >
              <div class="kb-item-icon">
                <img
                  v-if="getIconSrc(base.icon)"
                  :src="getIconSrc(base.icon)"
                  alt="icon"
                  @error="handleIconError($event, base.icon)"
                  class="icon-img"
                />
                <span class="icon-emoji" :style="{ display: getIconSrc(base.icon) ? 'none' : 'inline-block' }">{{ getIconEmoji(base.icon) }}</span>
              </div>
              <div class="kb-item-info">
                <div class="kb-item-name">{{ base.name }}</div>
                <div class="kb-item-meta">{{ formatNumber(base.stats?.docs ?? 0) }} 篇文档</div>
              </div>
              <svg v-if="base.id === currentBaseId" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            
            <div v-if="!bases.length" class="empty-list">
              <div class="empty-icon">📚</div>
              <p>暂无知识库</p>
              <button v-if="hasCreateKbPermission" class="create-first-btn" @click="openCreateBaseModal">
                创建知识库
              </button>
            </div>
          </div>
        </div>

        <!-- 管理模式：管理导航 -->
        <div v-else class="manage-section">
          <div class="section-label">{{ currentBaseName }}</div>
          <div class="manage-nav">
            <button 
              class="nav-item" 
              :class="{ active: manageTab === 'overview' }"
              @click="manageTab = 'overview'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>概览</span>
            </button>
            <button 
              v-if="caps.canManageMembers"
              class="nav-item" 
              :class="{ active: manageTab === 'members' }"
              @click="manageTab = 'members'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>成员管理</span>
            </button>
            <button 
              v-if="caps.canManageBase"
              class="nav-item" 
              :class="{ active: manageTab === 'settings' }"
              @click="manageTab = 'settings'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>设置</span>
            </button>
          </div>
          
          <div class="section-divider"></div>
          
          <!-- 返回文档按钮 -->
          <button class="back-to-docs-btn" @click="switchMode('docs')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>返回文档</span>
          </button>
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <main class="content-panel" v-loading="pageLoading || contextLoading">
        <!-- 文档模式内容 -->
        <template v-if="viewMode === 'docs'">
          <!-- 知识库信息头部 -->
          <div class="detail-header">
            <div class="kb-info">
              <div class="kb-main-icon">
                <img
                  v-if="getCurrentIconSrc()"
                  :src="getCurrentIconSrc()"
                  alt="icon"
                  @error="handleCurrentIconError"
                  class="icon-img"
                />
                <span class="icon-emoji" :style="{ display: getCurrentIconSrc() ? 'none' : 'inline-block' }">{{ getCurrentIconEmoji() }}</span>
              </div>
              <div class="kb-details">
                <h2 class="kb-name">{{ currentBaseName }}</h2>
                <p class="kb-desc">{{ currentBaseDescription || '暂无描述' }}</p>
              </div>
            </div>
          </div>

          <!-- 统计卡片 -->
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-icon">📄</div>
              <div class="stat-content">
                <div class="stat-value">{{ totalDocCount }}</div>
                <div class="stat-label">文档总数</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📅</div>
              <div class="stat-content">
                <div class="stat-value">{{ lastUpdateTime }}</div>
                <div class="stat-label">最近更新</div>
              </div>
            </div>
          </div>

          <!-- 文档树区域 -->
          <div class="document-section">
            <div class="section-header-bar">
              <h3 class="section-title">文档结构</h3>
              <div class="section-header-right">
                <span class="doc-count">共 {{ totalDocCount }} 个文档</span>
                <button v-if="documentTree && documentTree.length > 0" class="add-doc-btn" @click="startWriting">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  新建文档
                </button>
              </div>
            </div>
            
            <div class="document-content">
              <div v-if="!documentTree || documentTree.length === 0" class="empty-docs">
                <div class="empty-icon">📝</div>
                <h4>还没有文档</h4>
                <p>点击「新建文档」开始创建</p>
              <button class="create-doc-btn" @click="startWriting">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                新建文档
              </button>
              </div>

              <div v-else class="tree-wrapper">
                <DocumentTree
                  :documents="documentTree"
                  :selected-key="null"
                  :kb-id="currentBaseId"
                  readonly
                  @select="openDoc"
                  @request-move="handleRequestMove"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 管理模式内容 -->
        <template v-else>
          <!-- 管理概览 -->
          <div v-if="manageTab === 'overview'" class="manage-content">
            <div class="content-header">
              <h2 class="content-title">概览</h2>
              <p class="content-subtitle">查看知识库的基本信息</p>
            </div>
            
            <div class="overview-grid">
              <div class="overview-card">
                <div class="card-icon">🔒</div>
                <div class="card-content">
                  <div class="card-label">可见性</div>
                  <div class="card-value">{{ visibilityLabel }}</div>
                </div>
              </div>
              <div class="overview-card">
                <div class="card-icon">📅</div>
                <div class="card-content">
                  <div class="card-label">创建时间</div>
                  <div class="card-value">{{ formatDate(context?.knowledgeBase?.creationTime) }}</div>
                </div>
              </div>
              <div class="overview-card">
                <div class="card-icon">🔄</div>
                <div class="card-content">
                  <div class="card-label">最后更新</div>
                  <div class="card-value">{{ formatDate(context?.knowledgeBase?.lastModificationTime) }}</div>
                </div>
              </div>
              <div class="overview-card">
                <div class="card-icon">👤</div>
                <div class="card-content">
                  <div class="card-label">我的角色</div>
                  <div class="card-value">{{ membershipRoleLabel }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 成员管理 -->
          <div v-else-if="manageTab === 'members'" class="manage-content">
            <div class="content-header">
              <div>
                <h2 class="content-title">成员管理</h2>
                <p class="content-subtitle">管理成员角色与权限</p>
              </div>
            <button 
              v-if="canAddMemberFromTeam" 
              class="action-btn primary" 
              @click="openAddMember"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              添加成员
              </button>
            </div>

            <div v-if="membersLoading" class="loading-state">
              <div class="loading-spinner"></div>
              <p>成员加载中...</p>
          </div>

            <template v-else>
              <div v-if="members.length" class="members-table-wrapper">
                <div class="members-table">
                  <div class="table-head">
                    <div class="col col-member">成员</div>
                    <div class="col col-role">角色</div>
                    <div class="col col-time">加入时间</div>
                    <div class="col col-actions">操作</div>
          </div>

                  <div v-for="item in members" :key="item.id || item.userId" class="table-row">
                    <div class="col col-member">
                      <div class="member-avatar">{{ (item.userName || 'U')[0].toUpperCase() }}</div>
                      <div class="member-info">
                        <div class="member-name">{{ item.userName }}</div>
                        <div class="member-email">{{ item.userId }}</div>
      </div>
                    </div>

                    <div class="col col-role">
                      <div 
                        class="role-select" 
                        :class="{ disabled: !caps.canManageMembers, open: isRoleDropdownOpen(item) }" 
                        @click="toggleRoleDropdown(item)"
                      >
                        <span class="role-badge" :class="getRoleClass(item.role)">{{ getRoleLabel(item.role) }}</span>
                        <svg v-if="caps.canManageMembers" class="role-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>

                        <Transition name="dropdown-fade">
                          <div v-if="isRoleDropdownOpen(item)" class="role-dropdown" @click.stop>
                            <button 
                              v-for="role in roleOptions" 
                              :key="role" 
                              class="role-option"
                              :class="{ active: role === item.role }" 
                              @click="handleSelectRole(item, role)"
                            >
                              <span class="role-badge small" :class="getRoleClass(role)">{{ getRoleLabel(role) }}</span>
                              <svg v-if="role === item.role" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </Transition>
                      </div>
                    </div>

                    <div class="col col-time">
                      {{ formatDate(item.creationTime) }}
                    </div>

                    <div class="col col-actions">
                      <button class="remove-btn" :disabled="!caps.canManageMembers" @click="handleRemove(item)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        移除
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="empty-state">
                <div class="empty-icon">👥</div>
                <h4>暂无成员</h4>
                <p>点击「添加成员」邀请团队成员</p>
              </div>
            </template>
          </div>

          <!-- 设置 -->
          <div v-else-if="manageTab === 'settings'" class="manage-content">
            <div class="content-header">
              <h2 class="content-title">设置</h2>
              <p class="content-subtitle">配置知识库的高级选项</p>
            </div>
            
            <div class="empty-state">
              <div class="empty-icon">⚙️</div>
              <h4>设置面板待补充</h4>
              <p>更多设置选项即将上线</p>
            </div>
          </div>
        </template>
    </main>
    </div>
  </div>

  <!-- 创建文档弹窗 -->
  <CreateDocModal 
    v-model="createDocModalVisible" 
    :bases="bases" 
    :parent-options="parentOptions" 
    :templates="templates"
    :default-base-id="currentBaseId" 
    :default-parent-id="createParentId"
    :submitting="creatingDoc" 
    @submit="handleCreateDocSubmit" 
  />
    
  <!-- 创建知识库弹窗 -->
  <CreateBaseModal
    v-model="createBaseVisible"
    :submitting="creatingBase"
    @submit="handleCreateBaseSubmit"
  />
  
  <!-- 移动文档弹窗（父组件控制） -->
  <MoveDocModal
    v-model="moveModalVisible"
    :documents="documentTree"
    :source-id="moveSourceId"
    :submitting="moveSubmitting"
    @submit="handleMoveSubmit"
    @cancel="handleMoveCancel"
  />

  <!-- 添加成员弹窗 -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="addMemberVisible" class="modal-overlay" @click.self="addMemberVisible = false">
        <div class="modal-container" :class="{ 'modal-wide': currentKbTeamId }">
          <div class="modal-header">
            <h3 class="modal-title">添加成员</h3>
            <button class="modal-close" @click="addMemberVisible = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- 团队知识库：从团队成员中选择 -->
            <template v-if="currentKbTeamId">
              <div class="form-group">
                <label class="form-label">选择团队成员</label>
                <p class="form-hint">从团队成员中选择要添加到知识库的用户（可多选）</p>
              </div>
              
              <div v-if="teamMembersLoading" class="team-members-loading">
                <div class="loading-spinner small"></div>
                <span>加载团队成员中...</span>
              </div>
              
              <div v-else-if="teamMembers.length === 0" class="team-members-empty">
                <span>暂无可添加的团队成员</span>
              </div>
              
              <div v-else class="team-members-list">
                <div 
                  v-for="member in teamMembers" 
                  :key="member.userId" 
                  class="team-member-item"
                  :class="{ selected: isTeamMemberSelected(member) }"
                  @click="toggleTeamMemberSelect(member)"
                >
                  <div class="member-checkbox">
                    <svg v-if="isTeamMemberSelected(member)" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="member-avatar small">{{ (member.username || 'U')[0].toUpperCase() }}</div>
                  <div class="member-info">
                    <div class="member-name">{{ member.username || '未知用户' }}</div>
                    <div class="member-team-role">{{ getTeamRoleLabel(member.role) }}</div>
                  </div>
                </div>
              </div>
              
              <div v-if="selectedTeamMembers.length > 0" class="selected-count">
                已选择 {{ selectedTeamMembers.length }} 位成员
              </div>
              
              <div class="form-group">
                <label class="form-label">分配角色</label>
                <div class="form-select-wrapper">
                  <select v-model="addMemberRole" class="form-select">
                    <option value="Owner">所有者 (Owner)</option>
                    <option value="Admin">管理员 (Admin)</option>
                    <option value="Editor">编辑者 (Editor)</option>
                    <option value="Viewer">查看者 (Viewer)</option>
                  </select>
                  <svg class="select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </template>
            
            <!-- 非团队知识库：手动输入用户标识 -->
            <template v-else>
              <div class="form-group">
                <label class="form-label">用户标识</label>
                <input 
                  v-model="addMemberForm.userId" 
                  class="form-input" 
                  placeholder="输入用户ID或邮箱" 
                />
              </div>

              <div class="form-group">
                <label class="form-label">角色</label>
                <div class="form-select-wrapper">
                  <select v-model="addMemberForm.role" class="form-select">
                    <option value="Owner">所有者 (Owner)</option>
                    <option value="Admin">管理员 (Admin)</option>
                    <option value="Editor">编辑者 (Editor)</option>
                    <option value="Viewer">查看者 (Viewer)</option>
                  </select>
                  <svg class="select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </template>
          </div>

          <div class="modal-footer">
            <button class="modal-btn secondary" @click="addMemberVisible = false">取消</button>
            <button 
              class="modal-btn primary" 
              :disabled="addingMember || (currentKbTeamId && selectedTeamMembers.length === 0)" 
              @click="handleAddMember"
            >
              {{ addingMember ? '处理中...' : (currentKbTeamId ? `添加 ${selectedTeamMembers.length} 位成员` : '确定') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineOptions({ name: 'KnowledgeOverviewPage' })
import { computed, ref, watch, onMounted, onUnmounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { kbApi } from '@/api/kb.api'
import { sysApi } from '@/api/sys.api'
import { useKbContextStore } from '@/stores/kbContext'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useTeamStore } from '@/stores/team'
import { usePermission } from '@/composables/usePermission'
import { KB_PERMISSIONS } from '@/permission/permission.constants'
import { KB_ICON_OPTIONS, DEFAULT_ICON_KEY } from '@/constants/kbIcons'
import DocumentTree from '@/components/knowledge/DocumentTree.vue'
import MoveDocModal from '@/components/knowledge/modals/MoveDocModal.vue'
import CreateDocModal from '@/components/knowledge/modals/CreateDocModal.vue'
import CreateBaseModal from '@/components/knowledge/modals/CreateBaseModal.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const router = useRouter()
const route = useRoute()
const baseStore = useKnowledgeBaseStore()
const contextStore = useKbContextStore()
const teamStore = useTeamStore()
const { has } = usePermission()

// 注入父组件提供的数据
const kbWorkspace = inject('kbWorkspace', null)

// 视图模式：docs(文档) / manage(管理)
const viewMode = ref('docs')
const manageTab = ref('overview')

const bases = ref([])
const currentBaseId = ref('')

const context = ref(null)
const documentTree = ref([])
const contextLoading = ref(false)

const pageLoading = ref(false)
const searchKeyword = ref('')

const createDocModalVisible = ref(false)
const creatingDoc = ref(false)
const createParentId = ref(null)
const templates = ref([])

// 知识库创建
const createBaseVisible = ref(false)
const creatingBase = ref(false)

// 图标错误处理
const iconErrorMap = ref(new Set())

// 成员管理
const members = ref([])
const membersLoading = ref(false)
const addMemberVisible = ref(false)
const addingMember = ref(false)
const addMemberForm = ref({ userId: '', role: 'Viewer' })
const openRoleUserId = ref(null)
const roleOptions = ['Owner', 'Admin', 'Editor', 'Viewer']

// 团队成员选择相关
const teamMembers = ref([])
const teamMembersLoading = ref(false)
const selectedTeamMembers = ref([])
const addMemberRole = ref('Viewer')

// 权限
const hasCreateKbPermission = computed(() => has(KB_PERMISSIONS.BASE_CREATE))
const caps = computed(() => context.value?.uiCapabilities ?? {})
const membership = computed(() => context.value?.membership ?? {})

// 当前知识库所属的团队ID（从多个来源获取）
const currentKbTeamId = computed(() => {
  // 1. 优先从 context 中获取
  if (context.value?.knowledgeBase?.teamId) {
    return context.value.knowledgeBase.teamId
  }
  // 2. 从 bases 列表中查找
  if (currentBaseId.value && bases.value.length > 0) {
    const currentBase = bases.value.find(b => b.id === currentBaseId.value)
    if (currentBase?.teamId) {
      return currentBase.teamId
    }
  }
  // 3. 如果处于团队模式，使用当前团队 ID
  if (teamStore.isTeamMode && teamStore.currentTeamId) {
    return teamStore.currentTeamId
  }
  return null
})

// 用户是否有权限添加成员（从团队成员中选择）
// - 个人知识库 (teamId = null): 不支持，邀请功能后期开发
// - 团队知识库 (teamId 有值): 需要是团队的 Admin/Owner
const canAddMemberFromTeam = computed(() => {
  // 首先需要有知识库成员管理权限
  if (!caps.value.canManageMembers) return false
  
  const teamId = currentKbTeamId.value
  
  // 个人知识库：暂不支持添加成员（邀请功能待开发）
  if (!teamId) {
    return false
  }
  
  // 团队知识库：需要是团队的 Admin 或 Owner
  return teamStore.isTeamAdminById(teamId)
})

// 角色相关
const roleLabelMap = {
  Owner: '所有者',
  Admin: '管理员',
  Editor: '编辑者',
  Viewer: '查看者',
}

const visibilityLabelMap = {
  'Private': '私密',
  'Public': '公开',
  'Team': '团队可见',
}

const membershipRoleLabel = computed(() => {
  const role = membership.value?.role
  return role ? (roleLabelMap[role] ?? role) : '-'
})

const visibilityLabel = computed(() => {
  const visibility = context.value?.knowledgeBase?.visibility
  return visibility ? (visibilityLabelMap[visibility] ?? visibility) : '-'
})

const getRoleLabel = (role) => {
  // 如果是数字（TeamMemberRole 枚举），优先使用团队角色映射
  if (typeof role === 'number') {
    return teamRoleLabelMap[role] ?? String(role)
  }
  return roleLabelMap[role] ?? role
}

// 团队成员角色标签（TeamMemberRole 枚举）
const teamRoleLabelMap = {
  0: '所有者',
  1: '管理员',
  2: '成员',
}
const getTeamRoleLabel = (role) => teamRoleLabelMap[role] ?? '成员'

const getRoleClass = (role) => {
  // 支持字符串和数字两种表示
  if (typeof role === 'number') {
    // 数字映射到样式（0=Owner,1=Admin,2=Member）
    const numMap = {
      0: 'role-owner',
      1: 'role-admin',
      2: 'role-editor',
    }
    return numMap[role] || 'role-viewer'
  }
  const classMap = {
    Owner: 'role-owner',
    Admin: 'role-admin',
    Editor: 'role-editor',
    Viewer: 'role-viewer',
  }
  return classMap[role] || 'role-viewer'
}

const getUserKey = (user) => user?.id || user?.userId
const isRoleDropdownOpen = (user) => openRoleUserId.value === getUserKey(user)

const closeRoleDropdown = () => {
  openRoleUserId.value = null
}

const toggleRoleDropdown = (user) => {
  if (!caps.value.canManageMembers) return
  const key = getUserKey(user)
  openRoleUserId.value = openRoleUserId.value === key ? null : key
}

const handleSelectRole = (user, role) => {
  if (!caps.value.canManageMembers) return
  user.role = role
  closeRoleDropdown()
  handleChangeRole(user, role)
}

const handleDocumentClick = (e) => {
  if (!openRoleUserId.value) return
  const target = e.target
  if (!(target && target.closest && target.closest('.role-select'))) {
    closeRoleDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

// 格式化
const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num
}

const formatDate = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
}

// 模式切换
const switchMode = async (mode) => {
  viewMode.value = mode
  if (mode === 'manage') {
    manageTab.value = 'overview'
    // 加载管理数据
    await loadManageData()
  }
}

// 从workspace或baseStore加载知识库列表
const loadBases = async () => {
  try {
    const res = await kbApi.kb.list()
    const list = res?.items || res?.list || res || []
    
    // 过滤团队/个人知识库
    bases.value = Array.isArray(list)
      ? list.filter((item) => {
          const isTeamBase = !!item.teamId
          if (!teamStore.isTeamMode) return !isTeamBase
          return item.teamId === teamStore.currentTeamId
        })
      : []
    
    baseStore.setBases(bases.value)
    
    // 如果路由没有 baseId，自动跳转第一个
    if (!currentBaseId.value && bases.value.length > 0) {
      router.replace({ name: 'kb-overview', params: { baseId: bases.value[0].id } })
    }
  } catch (error) {
    console.error('加载知识库列表失败:', error)
    bases.value = []
  }
}

// 初始化加载
onMounted(async () => {
  if (kbWorkspace && kbWorkspace.bases) {
    bases.value = kbWorkspace.bases.value || []
  } else {
    await loadBases()
  }
})

// 团队切换后刷新数据
const refreshAfterTeamChange = async () => {
  // 重新加载知识库列表
  await loadBases()
  
  // 如果当前知识库不在新列表中，跳转到第一个
  if (bases.value.length > 0) {
    const currentInList = bases.value.some(b => b.id === currentBaseId.value)
    if (!currentInList) {
      router.replace({ name: 'kb-overview', params: { baseId: bases.value[0].id } })
    }
  } else {
    // 没有知识库，清空当前选择
    documentTree.value = []
  }
}

// 团队切换
const selectPersonal = async () => {
  const wasTeamMode = teamStore.isTeamMode
  await teamStore.setCurrentTeam(null)
  // 如果确实发生了切换，刷新数据
  if (wasTeamMode) {
    await refreshAfterTeamChange()
  }
}

const selectTeam = async (teamId) => {
  if (!teamId) return
  const oldTeamId = teamStore.currentTeamId
  await teamStore.setCurrentTeam(teamId)
  // 如果确实发生了切换，刷新数据
  if (oldTeamId !== teamId) {
    await refreshAfterTeamChange()
  }
}

// 知识库切换
const handleBaseSelect = (id) => {
  if (!id || id === currentBaseId.value) return
  router.push({ name: 'kb-overview', params: { baseId: id } })
}

// 创建知识库
const openCreateBaseModal = () => {
  if (kbWorkspace && kbWorkspace.openCreateBaseModal) {
    kbWorkspace.openCreateBaseModal()
  } else {
    createBaseVisible.value = true
  }
}

const handleCreateBaseSubmit = async (payload) => {
  if (creatingBase.value) return
  try {
    creatingBase.value = true
    const isTeamCreate = teamStore.isTeamMode || payload.createType === 'team'
    const targetTeamId = isTeamCreate ? (teamStore.currentTeamId || payload.teamId) : ''
    const newBase = await kbApi.kb.create({
      name: payload.name.trim(),
      description: (payload.description || '').trim(),
      visibility: payload.visibility,
      icon: payload.icon || 'icon_default',
      allowMembersCreateDoc: !!payload.allowMembersCreateDoc,
      teamId: isTeamCreate ? targetTeamId : '',
    })
    bases.value = [newBase, ...(bases.value || [])]
    baseStore.setBases(bases.value)
    createBaseVisible.value = false
    ElMessage.success('知识库已创建')
    router.push({ name: 'kb-overview', params: { baseId: newBase.id } })
  } catch (error) {
    ElMessage.error(error?.message || '创建失败')
  } finally {
    creatingBase.value = false
  }
}

// 图标处理
const getIconSrc = (iconKey) => {
  if (!iconKey || iconKey === DEFAULT_ICON_KEY || iconErrorMap.value.has(iconKey)) {
    return null
  }
  const iconOption = KB_ICON_OPTIONS.find(opt => opt.value === iconKey)
  return iconOption?.imageSrc || null
}

const getIconEmoji = (iconKey) => {
  if (!iconKey) return '📚'
  const iconOption = KB_ICON_OPTIONS.find(opt => opt.value === iconKey)
  return iconOption?.emoji || '📚'
}

const handleIconError = (event, iconKey) => {
  iconErrorMap.value.add(iconKey)
  event.target.style.display = 'none'
}

const getCurrentIconSrc = () => {
  const base = bases.value.find(b => b.id === currentBaseId.value)
  if (!base || !base.icon) return null
  return getIconSrc(base.icon)
}

const getCurrentIconEmoji = () => {
  const base = bases.value.find(b => b.id === currentBaseId.value)
  if (!base || !base.icon) return '📚'
  return getIconEmoji(base.icon)
}

const handleCurrentIconError = (event) => {
  const base = bases.value.find(b => b.id === currentBaseId.value)
  if (base && base.icon) {
    handleIconError(event, base.icon)
  }
}

// 加载管理数据
const loadManageData = async () => {
  if (!currentBaseId.value) return
  contextLoading.value = true
  try {
    context.value = await contextStore.loadContext(currentBaseId.value, { force: true })
    // 如果在成员管理tab，加载成员
    if (manageTab.value === 'members' && caps.value.canManageMembers) {
      await loadMembers()
  }
  } catch (error) {
    ElMessage.error(error?.message ?? '加载上下文失败')
  } finally {
    contextLoading.value = false
  }
}

// 成员管理
const loadMembers = async () => {
  if (!currentBaseId.value) return
  membersLoading.value = true
  try {
    const res = await kbApi.members.list(currentBaseId.value)
    members.value = res?.items ?? []
  } catch (error) {
    ElMessage.error(error?.message ?? '加载成员失败')
  } finally {
    membersLoading.value = false
  }
}

const openAddMember = async () => {
  addMemberForm.value = { userId: '', role: 'Viewer' }
  selectedTeamMembers.value = []
  addMemberRole.value = 'Viewer'
  addMemberVisible.value = true
  
  // 如果是团队知识库，加载团队成员
  if (currentKbTeamId.value) {
    await loadTeamMembers(currentKbTeamId.value)
  }
}

const loadTeamMembers = async (teamId) => {
  if (!teamId) return
  teamMembersLoading.value = true
  try {
    const res = await sysApi.team.getTeamMembers(teamId)
    // res 可能是数组或 { items: [] }
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    
    // 过滤掉已经是知识库成员的用户
    const existingMemberIds = new Set(members.value.map(m => m.userId))
    teamMembers.value = list.filter(tm => !existingMemberIds.has(tm.userId))
  } catch (error) {
    console.error('加载团队成员失败:', error)
    ElMessage.error('加载团队成员失败')
    teamMembers.value = []
  } finally {
    teamMembersLoading.value = false
  }
}

const toggleTeamMemberSelect = (member) => {
  const id = member.userId
  const idx = selectedTeamMembers.value.findIndex(m => m.userId === id)
  if (idx >= 0) {
    selectedTeamMembers.value.splice(idx, 1)
  } else {
    selectedTeamMembers.value.push(member)
  }
}

const isTeamMemberSelected = (member) => {
  return selectedTeamMembers.value.some(m => m.userId === member.userId)
}

const handleAddMember = async () => {
  const kbId = currentBaseId.value
  
  // 团队知识库：从选中的团队成员中添加
  if (currentKbTeamId.value && selectedTeamMembers.value.length > 0) {
    addingMember.value = true
    try {
      // 批量添加选中的成员
      const promises = selectedTeamMembers.value.map(member => 
        kbApi.members.addOrUpdate(kbId, { userId: member.userId, role: addMemberRole.value })
      )
      await Promise.all(promises)
      ElMessage.success(`成功添加 ${selectedTeamMembers.value.length} 位成员`)
      addMemberVisible.value = false
      selectedTeamMembers.value = []

      await loadMembers()
      await loadManageData()
    } catch (error) {
      ElMessage.error(error?.message ?? '添加成员失败')
    } finally {
      addingMember.value = false
    }
    return
  }
  
  // 非团队知识库或手动输入：原逻辑
  const { userId, role } = addMemberForm.value
  if (!userId) {
    ElMessage.warning('请输入用户标识')
    return
  }

  addingMember.value = true
  try {
    await kbApi.members.addOrUpdate(kbId, { userId, role })
    ElMessage.success('添加成功')
    addMemberVisible.value = false
    await loadMembers()
    await loadManageData()
  } catch (error) {
    ElMessage.error(error?.message ?? '添加成员失败')
  } finally {
    addingMember.value = false
  }
}

const handleChangeRole = async (row, newRole) => {
  try {
    await kbApi.members.changeRole(currentBaseId.value, row.userId, newRole)
    ElMessage.success('角色已更新')
    await loadManageData()
  } catch (error) {
    const code = error?.code
    if (code === 'CannotDowngradeLastOwner') {
      ElMessage.error('无法降级最后一个 Owner')
    } else {
      ElMessage.error(error?.message ?? '更新角色失败')
    }
  }
}

const handleRemove = async (row) => {
  try {
    await ElMessageBox.confirm(`确认移除成员 ${row.userName} ?`, '确认移除')
    await kbApi.members.remove(currentBaseId.value, row.userId)
    ElMessage.success('已移除')
    await loadMembers()
    await loadManageData()
  } catch (error) {
    if (error === 'cancel') return
    const code = error?.response?.data?.code
    if (code === 'CannotRemoveLastOwner') {
      ElMessage.error('无法移除最后一个 Owner')
    } else {
      ElMessage.error(error?.message ?? '移除失败')
    }
  }
}

// 监听管理tab切换
watch(manageTab, async (tab) => {
  if (tab === 'members' && caps.value.canManageMembers) {
    await loadMembers()
  }
})

// 页面数据加载
const loadOverviewData = async () => {
  if (!currentBaseId.value) return
  pageLoading.value = true
  contextLoading.value = true
  try {
    context.value = await contextStore.loadContext(currentBaseId.value, { force: false })
    const uiCaps = context.value?.uiCapabilities || {}
    if (uiCaps.canView === false) {
      documentTree.value = []
      ElMessage.warning('无权限查看该知识库')
      return
    }
    const tree = await kbApi.document.getTree(currentBaseId.value)
    documentTree.value = Array.isArray(tree) ? tree : []
  } catch (error) {
    console.error('加载知识库数据失败:', error)
    ElMessage.error(error?.message)
  } finally {
    pageLoading.value = false
    contextLoading.value = false
  }
}

// Move modal state controlled by this parent
const moveModalVisible = ref(false)
const moveSubmitting = ref(false)
const moveSourceId = ref(null)

const handleRequestMove = ({ id }) => {
  moveSourceId.value = id
  moveModalVisible.value = true
}

const handleMoveCancel = () => {
  moveModalVisible.value = false
  moveSourceId.value = null
}

const handleMoveSubmit = async ({ parentId }) => {
  if (!currentBaseId.value || !moveSourceId.value) return
  moveSubmitting.value = true
  try {
    await kbApi.document.move(currentBaseId.value, moveSourceId.value, { parentId: parentId ?? null })
    ElMessage.success('移动成功')
    moveModalVisible.value = false
    moveSourceId.value = null
    await loadOverviewData()
  } catch (error) {
    console.error('移动文档失败', error)
    ElMessage.error(error?.message ?? '移动失败')
  } finally {
    moveSubmitting.value = false
  }
}

// 父文档选项
const parentOptions = computed(() => {
  const buildOptions = (nodes = []) =>
    nodes.map((node) => ({
      label: node.title,
      value: node.id,
      children: buildOptions(node.children || []),
    }))
  return buildOptions(documentTree.value)
})

const startWriting = () => {
  if (!currentBaseId.value) return
  createParentId.value = null
  createDocModalVisible.value = true
}

const handleCreateDocSubmit = async ({ baseId, title, parentId, templateId }) => {
  if (creatingDoc.value) return

  const validTitle = title?.trim()
  if (!validTitle) {
    ElMessage.warning('请输入标题')
    return
  }

  const targetBase = baseId || currentBaseId.value
  if (!targetBase) {
    ElMessage.error('无法确定知识库')
    return
  }

  creatingDoc.value = true
  try {
    let initialContentJson = null
    if (templateId) {
      initialContentJson = JSON.stringify({ templateId })
    }

    const newDoc = await kbApi.document.create(targetBase, {
      title: validTitle,
      parentId: parentId ?? createParentId.value,
      type: 'Normal',
      initialContentJson: initialContentJson,
    })

    await loadOverviewData()

    createDocModalVisible.value = false
    createParentId.value = null
    ElMessage.success('文档创建成功')
    router.push(`/kb/${targetBase}/edit/${newDoc.id}`)
  } catch (error) {
    console.error('创建文档失败:', error)
    ElMessage.error(error?.message || '创建失败')
  } finally {
    creatingDoc.value = false
  }
}

const openDoc = (docId) => {
  if (!docId || !currentBaseId.value) return
  router.push(`/kb/${currentBaseId.value}/edit/${docId}`)
}

const handleSearch = () => {
  if (!searchKeyword.value.trim() || !currentBaseId.value) return
  ElMessage.success(`即将跳转到编辑器搜索 "${searchKeyword.value}"`)
  router.push(`/kb/${currentBaseId.value}/edit`)
}

// 计算属性
const currentBaseName = computed(() => {
  const base = bases.value.find(b => b.id === currentBaseId.value)
  return base?.name || '当前知识库'
})

const currentBaseDescription = computed(() => {
  const base = bases.value.find(b => b.id === currentBaseId.value)
  return base?.description || ''
})

const totalDocCount = computed(() => {
  const countDocs = (nodes) => {
    let count = 0
    for (const node of nodes) {
      count++
      if (node.children && node.children.length > 0) {
        count += countDocs(node.children)
      }
    }
    return count
  }
  return documentTree.value ? countDocs(documentTree.value) : 0
})

const lastUpdateTime = computed(() => {
  return format(new Date(), 'MM月dd日', { locale: zhCN })
})

// 监听路由参数 baseId 变化
watch(
  () => route.params.baseId,
  async (baseId) => {
    if (!baseId || baseId === currentBaseId.value) return
    currentBaseId.value = baseId
    baseStore.setCurrentBaseId(baseId)
    viewMode.value = 'docs' // 切换知识库时重置为文档模式
    await loadOverviewData()
  },
  { immediate: true }
)
</script>

<style scoped>
.kb-overview-page {
  min-height: 100vh;
  background: #F5F6F7;
  display: flex;
  flex-direction: column;
}

/* ===== 顶部导航栏 ===== */
.top-header {
  background: #0f172a;
  padding: 14px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
  text-decoration: none;
  transition: all 0.2s ease;
}

.back-home-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(-2px);
}

.page-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #FFFFFF;
}

/* 文档/管理切换器 */
.mode-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab:hover {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
}

.mode-tab.active {
  background: #FFFFFF;
  color: #0f172a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
}

.search-input {
  width: 200px;
  height: 36px;
  padding: 0 12px 0 38px;
  font-size: 13px;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

/* ===== 主内容区 ===== */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ===== 左侧面板 ===== */
.side-panel {
  width: 280px;
  flex-shrink: 0;
  background: #FFFFFF;
  border-right: 1px solid #E8E8E8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0 4px;
  margin-bottom: 8px;
}

.section-divider {
  height: 1px;
  background: #E8E8E8;
  margin: 16px 16px;
}

/* 团队切换区 */
.team-section {
  padding: 16px 16px 0;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.team-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.team-item:hover {
  background: #F5F6F7;
  color: #1a1a1a;
}

.team-item.active {
  background: #0f172a;
  color: #FFFFFF;
}

.team-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.team-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

/* 知识库列表区 */
.kb-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #0f172a;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-btn:hover {
  background: #1e293b;
}

.kb-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 16px;
}

.kb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #FAFAFA;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-item:hover {
  background: #F0F0F0;
  border-color: #E0E0E0;
}

.kb-item.active {
  background: #0f172a;
  border-color: #0f172a;
}

.kb-item.active .kb-item-name {
  color: #FFFFFF;
}

.kb-item.active .kb-item-meta {
  color: rgba(255, 255, 255, 0.6);
}

.kb-item.active .check-icon {
  color: #FFFFFF;
}

.kb-item-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border-radius: 6px;
  overflow: hidden;
}

.kb-item-icon .icon-img {
  width: 22px;
  height: 22px;
  object-fit: cover;
}

.kb-item-icon .icon-emoji {
  font-size: 18px;
}

.kb-item-info {
  flex: 1;
  min-width: 0;
}

.kb-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-item-meta {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.empty-list {
  text-align: center;
  padding: 32px 16px;
  color: #999;
}

.empty-list .empty-icon {
  font-size: 2rem;
  margin-bottom: 8px;
  opacity: 0.5;
}

.empty-list p {
  margin: 0 0 12px;
  font-size: 13px;
}

.create-first-btn {
  padding: 8px 16px;
  background: #0f172a;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.create-first-btn:hover {
  background: #1e293b;
}

/* 管理导航区 */
.manage-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.manage-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: #F5F6F7;
  color: #1a1a1a;
}

.nav-item.active {
  background: #0f172a;
  color: #FFFFFF;
}

.back-to-docs-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;
  margin-bottom: 16px;
}

.back-to-docs-btn:hover {
  background: #F5F6F7;
  border-color: #CCCCCC;
  color: #1a1a1a;
}

/* ===== 右侧内容面板 ===== */
.content-panel {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 文档模式 - 详情头部 */
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 20px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
}

.kb-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.kb-main-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 10px;
  overflow: hidden;
}

.kb-main-icon .icon-img {
  width: 34px;
  height: 34px;
  object-fit: cover;
}

.kb-main-icon .icon-emoji {
  font-size: 28px;
}

.kb-details {
  flex: 1;
  min-width: 0;
}

.kb-name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
}

.kb-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

/* 操作按钮 */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.action-btn.primary {
  background: #0f172a;
  color: #FFFFFF;
}

.action-btn.primary:hover {
  background: #1e293b;
}

.action-btn.secondary {
  background: #FFFFFF;
  color: #1a1a1a;
  border: 1px solid #E0E0E0;
}

.action-btn.secondary:hover {
  background: #F5F5F5;
  border-color: #CCCCCC;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: #0f172a;
}

.stat-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 文档区域 */
.document-section {
  flex: 1;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #0f172a;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
}

.section-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.add-doc-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  background: #FFFFFF;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-doc-btn:hover {
  background: #f1f5f9;
}

.add-doc-btn svg {
  flex-shrink: 0;
}

.doc-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.document-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.empty-docs {
  text-align: center;
  padding: 48px 32px;
}

.empty-docs .empty-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.4;
}

.empty-docs h4 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.empty-docs p {
  margin: 0 0 16px;
  font-size: 13px;
  color: #666;
}

.create-doc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: #0f172a;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.create-doc-btn:hover {
  background: #1e293b;
}

.tree-wrapper {
  min-height: 200px;
}

/* ===== 管理模式内容 ===== */
.manage-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.content-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: #1a1a1a;
}

.content-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}

/* 概览卡片网格 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.overview-card:hover {
  border-color: #0f172a;
}

.card-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-label {
  font-size: 11px;
  font-weight: 500;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.card-value {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

/* 成员表格 */
.members-table-wrapper {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  /* 允许下拉等浮层脱离容器，不被裁剪 */
  overflow: visible;
}

.members-table {
  width: 100%;
}

.table-head {
  display: grid;
  grid-template-columns: 2.5fr 1.2fr 1.5fr 1fr;
  align-items: center;
  padding: 12px 16px;
  background: #0f172a;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-row {
  display: grid;
  grid-template-columns: 2.5fr 1.2fr 1.5fr 1fr;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #F0F0F0;
  transition: background 0.2s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #FAFBFC;
}

.col {
  padding: 0 6px;
}

.col-member {
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  border-radius: 50%;
}

.member-info {
  min-width: 0;
}

.member-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-email {
  font-size: 11px;
  color: #999;
  margin-top: 1px;
}

.col-time {
  font-size: 12px;
  color: #666;
}

/* 角色选择器 */
.role-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-select:not(.disabled):hover {
  background: #F5F6F7;
  border-color: #E8E8E8;
}

.role-select.disabled {
  cursor: default;
}

.role-select.open {
  background: #F5F6F7;
  border-color: #E8E8E8;
}

.role-arrow {
  transition: transform 0.2s ease;
}

.role-select.open .role-arrow {
  transform: rotate(180deg);
}

.role-badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
}

.role-badge.small {
  padding: 2px 6px;
  font-size: 10px;
}

.role-badge.role-owner {
  background: #FEF3C7;
  color: #92400E;
}

.role-badge.role-admin {
  background: #DBEAFE;
  color: #1E40AF;
}

.role-badge.role-editor {
  background: #D1FAE5;
  color: #065F46;
}

.role-badge.role-viewer {
  background: #F3F4F6;
  color: #4B5563;
}

.role-dropdown {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  min-width: 140px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 4px;
  /* 提高浮层 z-index，避免被顶部或其他容器遮挡 */
  z-index: 3000;
}

.role-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.role-option:hover {
  background: #F5F6F7;
}

.role-option.active {
  background: #F0F9FF;
}

.role-option svg {
  color: #0f172a;
}

/* 移除按钮 */
.remove-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #dc3a3a;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: #FEF2F2;
  border-color: #FECACA;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  color: #999;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #E8E8E8;
  border-top-color: #0f172a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin: 12px 0 0;
  font-size: 13px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 48px 32px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
}

.empty-state .empty-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.4;
}

.empty-state h4 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
  color: #666;
}

/* ===== 模态框 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-container {
  width: 440px;
  max-width: 92vw;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #E8E8E8;
}

.modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #999;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  color: #1a1a1a;
  background: #F5F6F7;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-size: 13px;
  color: #1a1a1a;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #0f172a;
}

.form-input::placeholder {
  color: #CCCCCC;
}

.form-select-wrapper {
  position: relative;
}

.form-select {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 12px;
  font-size: 13px;
  color: #1a1a1a;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-select:focus {
  outline: none;
  border-color: #0f172a;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
}

.modal-footer {
  padding: 14px 20px 18px;
  border-top: 1px solid #E8E8E8;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-btn.primary {
  background: #0f172a;
  color: #FFFFFF;
}

.modal-btn.primary:hover {
  background: #1e293b;
}

.modal-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.secondary {
  background: #FFFFFF;
  color: #1a1a1a;
  border: 1px solid #E8E8E8;
}

.modal-btn.secondary:hover {
  background: #F5F6F7;
}

/* 宽模态框（团队成员选择） */
.modal-container.modal-wide {
  width: 560px;
}

/* 表单提示 */
.form-hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}

/* 团队成员加载状态 */
.team-members-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  justify-content: center;
  color: #666;
}

.loading-spinner.small {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

/* 团队成员空状态 */
.team-members-empty {
  padding: 32px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

/* 团队成员列表 */
.team-members-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  margin-bottom: 16px;
}

.team-member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #F0F0F0;
}

.team-member-item:last-child {
  border-bottom: none;
}

.team-member-item:hover {
  background: #F9FAFB;
}

.team-member-item.selected {
  background: #F0F7FF;
}

.team-member-item.selected:hover {
  background: #E5F0FF;
}

/* 成员复选框 */
.member-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #D1D5DB;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.team-member-item.selected .member-checkbox {
  background: #0f172a;
  border-color: #0f172a;
  color: #FFFFFF;
}

/* 成员头像（小） */
.member-avatar.small {
  width: 32px;
  height: 32px;
  font-size: 13px;
  flex-shrink: 0;
}

/* 成员团队角色标签 */
.member-team-role {
  font-size: 12px;
  color: #999;
}

/* 已选计数 */
.selected-count {
  padding: 8px 0 16px;
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
}

/* 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .side-panel {
    width: 260px;
  }
  
  .content-panel {
    padding: 20px 24px;
  }
}

@media (max-width: 992px) {
  .main-content {
    flex-direction: column;
  }
  
  .side-panel {
    width: 100%;
    max-height: 280px;
    border-right: none;
    border-bottom: 1px solid #E8E8E8;
    flex-direction: row;
  }
  
  .team-section {
    width: auto;
    border-right: 1px solid #E8E8E8;
  }
  
  .section-divider {
    display: none;
  }
  
  .kb-section,
  .manage-section {
    flex: 1;
  }
  
  .overview-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .top-header {
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px 20px;
  }
  
  .mode-switcher {
    order: 3;
    width: 100%;
    justify-content: center;
  }
  
  .side-panel {
    flex-direction: column;
    max-height: none;
  }
  
  .team-section {
    border-right: none;
    border-bottom: 1px solid #E8E8E8;
  }
  
  .detail-header {
    flex-direction: column;
    gap: 14px;
  }
  
  .stats-row {
    grid-template-columns: 1fr;
  }
  
  .table-head {
    display: none;
  }
  
  .table-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
  }
  
  .col {
    padding: 0;
  }
  
  .col-member {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .top-header {
    padding: 10px 16px;
  }
  
  .page-title {
    font-size: 1rem;
  }
  
  .search-input {
    width: 140px;
  }
  
  .content-panel {
    padding: 16px;
  }
}
</style>
