<script setup lang="ts">
import { KbMember, KbMemberRole } from '@/api'

// 格式化日期
const formatDate = (d?: string) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
}

interface KbMemberWithUser extends KbMember {
  userName?: string
  userId: string
}

const props = defineProps<{
  members: KbMemberWithUser[]
  membersLoading: boolean
  canManageMembers: boolean
  isTeamKb: boolean
  currentBaseId: string | null
}>()

const emit = defineEmits<{
  (e: 'add-member'): void
  (e: 'change-role', member: KbMemberWithUser): void
  (e: 'remove-member', member: KbMemberWithUser): void
}>()

const roleLabelMap: Record<string, string> = {
  Owner: '所有者',
  Admin: '管理员',
  Editor: '编辑者',
  Viewer: '查看者',
}

const getRoleLabel = (role: string | number) => {
  if (typeof role === 'number') {
    return KbMemberRole[role] ? roleLabelMap[KbMemberRole[role]] || String(role) : String(role)
  }
  return roleLabelMap[role] || role
}

const getRoleClass = (role: string | number) => {
  const roleStr = typeof role === 'number' ? KbMemberRole[role] : role
  switch (roleStr) {
    case 'Owner':
      return 'role-owner'
    case 'Admin':
      return 'role-admin'
    case 'Editor':
      return 'role-editor'
    case 'Viewer':
    default:
      return 'role-viewer'
  }
}
</script>

<template>
  <div class="kb-members-content">
    <div class="kb-content-header">
      <div>
        <h2 class="kb-content-title">成员管理</h2>
        <p class="kb-content-subtitle">管理成员角色与权限</p>
      </div>
      <button v-if="canManageMembers" class="kb-action-btn primary" @click="emit('add-member')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        添加成员
      </button>
    </div>

    <div v-if="membersLoading" class="kb-loading-state">
      <div class="kb-loading-spinner"></div>
      <p>成员加载中...</p>
    </div>

    <template v-else>
      <div v-if="members.length" class="kb-members-table-wrapper">
        <div class="kb-members-table">
          <div class="kb-table-head">
            <div class="kb-col kb-col-member">成员</div>
            <div class="kb-col kb-col-role">角色</div>
            <div class="kb-col kb-col-time">加入时间</div>
            <div class="kb-col kb-col-actions">操作</div>
          </div>

          <div v-for="item in members" :key="item.id || item.userId" class="kb-table-row">
            <div class="kb-col kb-col-member">
              <div class="kb-member-avatar">{{ (item.userName || 'U')[0].toUpperCase() }}</div>
              <div class="kb-member-info">
                <div class="kb-member-name">{{ item.userName }}</div>
                <div class="kb-member-email">{{ item.userId }}</div>
              </div>
            </div>

            <div class="kb-col kb-col-role">
              <span class="kb-role-badge" :class="getRoleClass(item.role)">{{ getRoleLabel(item.role) }}</span>
            </div>

            <div class="kb-col kb-col-time">
              {{ formatDate(item.creationTime) }}
            </div>

            <div class="kb-col kb-col-actions">
              <button class="kb-action-btn-small" :disabled="!canManageMembers" @click="emit('change-role', item)">
                修改角色
              </button>
              <button class="kb-action-btn-small danger" :disabled="!canManageMembers" @click="emit('remove-member', item)">
                移除
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="kb-empty-state">
        <div class="empty-icon">👥</div>
        <h4>暂无成员</h4>
        <p>点击「添加成员」邀请团队成员</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kb-members-content {
  animation: fadeIn 0.2s ease;
}

.kb-content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.kb-content-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.kb-content-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 0;
}

.kb-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-action-btn.primary {
  background: #3b82f6;
  color: white;
}

.kb-action-btn.primary:hover {
  background: #2563eb;
}

.kb-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.kb-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.kb-loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
  margin-bottom: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.kb-members-table-wrapper {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.kb-members-table {
  width: 100%;
}

.kb-table-head {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kb-table-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s ease;
}

.kb-table-row:last-child {
  border-bottom: none;
}

.kb-table-row:hover {
  background: #fafbfc;
}

.kb-col {
  flex-shrink: 0;
}

.kb-col-member {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.kb-col-role {
  width: 100px;
}

.kb-col-time {
  width: 140px;
  color: #64748b;
  font-size: 13px;
}

.kb-col-actions {
  width: 160px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.kb-member-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.kb-member-avatar.small {
  width: 32px;
  height: 32px;
  font-size: 13px;
}

.kb-member-info {
  min-width: 0;
}

.kb-member-name {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-member-email {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.kb-role-badge.role-owner {
  background: #fef3c7;
  color: #92400e;
}

.kb-role-badge.role-admin {
  background: #dbeafe;
  color: #1e40af;
}

.kb-role-badge.role-editor {
  background: #d1fae5;
  color: #065f46;
}

.kb-role-badge.role-viewer {
  background: #f1f5f9;
  color: #475569;
}

.kb-action-btn-small {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.kb-action-btn-small:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.kb-action-btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kb-action-btn-small.danger {
  color: #ef4444;
  border-color: #fecaca;
}

.kb-action-btn-small.danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fca5a5;
}

.kb-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border: 1px dashed #e2e8f0;
  border-radius: 12px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.kb-empty-state h4 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.kb-empty-state p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
