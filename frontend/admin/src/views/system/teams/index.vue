<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { TeamDto, TeamMemberDto, UserDto } from '@/types'
import { getTeamRoleText, getTeamRoleName, getTeamRoleValue } from '@/types'
import * as teamApi from '@/api/team'
import * as userApi from '@/api/user'

const userStore = useUserStore()
// 使用 computed 使权限检查响应式，支持 * 通配符权限
const canManage = computed(() => userStore.hasPermission('system.teams.manage'))
const canView = computed(() => userStore.hasPermission('system.teams.view'))

// State
const loading = ref(false)
const tableData = ref<TeamDto[]>([])
const total = ref(0)

// Search params
const searchParams = reactive({
  skipCount: 0,
  maxResultCount: 10,
})

// Member dialog
const memberDialogVisible = ref(false)
const currentTeam = ref<TeamDto | null>(null)
const members = ref<TeamMemberDto[]>([])
const memberLoading = ref(false)

// Add member dialog
const addMemberDialogVisible = ref(false)
const addMemberLoading = ref(false)
const addMemberFormRef = ref<FormInstance>()
const addMemberForm = reactive({
  userId: '',
  role: 'Member' as 'Owner' | 'Manager' | 'Member',
})

const addMemberRules: FormRules = {
  userId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// User list for selection
const userList = ref<UserDto[]>([])
const userSearchLoading = ref(false)

// 获取选中用户的显示信息
const selectedUserDisplay = computed(() => {
  const user = userList.value.find(u => u.id === addMemberForm.userId)
  if (!user) return ''
  return `${user.userName} (${user.email})`
})

// Team CRUD dialog
const teamDialogVisible = ref(false)
const teamDialogTitle = ref('')
const teamDialogLoading = ref(false)
const isEditTeam = ref(false)
const editingTeamId = ref('')
const teamFormRef = ref<FormInstance>()
const teamForm = reactive({
  name: '',
  description: '',
})

const teamFormRules: FormRules = {
  name: [
    { required: true, message: '请输入团队名称', trigger: 'blur' },
    { min: 2, max: 100, message: '团队名称长度在 2-100 个字符', trigger: 'blur' },
  ],
}

// Fetch data
const fetchData = async () => {
  loading.value = true
  try {
    const res = await teamApi.getTeamList(searchParams)
    tableData.value = res.items
    total.value = res.totalCount
  } catch (error) {
    console.error('获取团队列表失败:', error)
  } finally {
    loading.value = false
  }
}

// Pagination
const handlePageChange = (page: number) => {
  searchParams.skipCount = (page - 1) * searchParams.maxResultCount
  fetchData()
}

const handleSizeChange = (size: number) => {
  searchParams.maxResultCount = size
  searchParams.skipCount = 0
  fetchData()
}

// Create team
const handleCreateTeam = () => {
  isEditTeam.value = false
  teamDialogTitle.value = '新建团队'
  Object.assign(teamForm, {
    name: '',
    description: '',
  })
  teamDialogVisible.value = true
}

// Edit team
const handleEditTeam = (row: TeamDto) => {
  isEditTeam.value = true
  editingTeamId.value = row.id
  teamDialogTitle.value = '编辑团队'
  Object.assign(teamForm, {
    name: row.name,
    description: row.description || '',
  })
  teamDialogVisible.value = true
}

// Submit team form
const handleTeamSubmit = async () => {
  const valid = await teamFormRef.value?.validate().catch(() => false)
  if (!valid) return

  teamDialogLoading.value = true
  try {
    if (isEditTeam.value) {
      await teamApi.updateTeam(editingTeamId.value, teamForm)
      ElMessage.success('团队更新成功')
    } else {
      await teamApi.createTeam(teamForm)
      ElMessage.success('团队创建成功')
    }
    teamDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('团队操作失败:', error)
  } finally {
    teamDialogLoading.value = false
  }
}

// Delete team
const handleDeleteTeam = async (row: TeamDto) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除团队"${row.name}"吗？删除后将无法恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await teamApi.deleteTeam(row.id)
    ElMessage.success('团队删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除团队失败:', error)
    }
  }
}

// View members
const handleViewMembers = async (row: TeamDto) => {
  currentTeam.value = row
  memberLoading.value = true

  try {
    const result = await teamApi.getTeamMembers(row.id)
    console.log('团队成员数据:', result)
    // 数据适配：将 API 返回的数据格式转换为组件需要的格式
    const memberList = Array.isArray(result) ? result.map((item: any): TeamMemberDto => ({
      id: item.id,
      teamId: item.teamId,
      userId: item.userId,
      userName: item.username || item.userName,  // API 返回的是小写 username
      username: item.username,
      email: item.email,
      role: getTeamRoleText(item.role) as 'Owner' | 'Manager' | 'Member',  // 将数字角色转换为字符串
      joinedAt: item.creationTime || item.joinedAt,  // API 返回的是 creationTime
      creationTime: item.creationTime
    })) : []

    // 检查当前用户在该团队中的角色
    const currentUserId = userStore.currentUser?.id
    const currentUserMember = memberList.find(m => m.userId === currentUserId)
    
    // 需要 view 权限且角色不为 Member 才能查看成员列表
    if (!canView.value || (currentUserMember && currentUserMember.role === 'Member')) {
      ElMessage.warning('您没有权限查看该团队成员')
      currentTeam.value = null
      return
    }

    members.value = memberList
    memberDialogVisible.value = true
  } catch (error) {
    console.error('获取团队成员失败:', error)
    ElMessage.error('获取团队成员失败')
    currentTeam.value = null
  } finally {
    memberLoading.value = false
  }
}

// Refresh members
const refreshMembers = async () => {
  if (!currentTeam.value) return
  memberLoading.value = true
  try {
    const result = await teamApi.getTeamMembers(currentTeam.value.id)
    console.log('刷新团队成员数据:', result)
    // 数据适配：将 API 返回的数据格式转换为组件需要的格式
    members.value = Array.isArray(result) ? result.map((item: any): TeamMemberDto => ({
      id: item.id,
      teamId: item.teamId,
      userId: item.userId,
      userName: item.username || item.userName,  // API 返回的是小写 username
      username: item.username,
      email: item.email,
      role: getTeamRoleText(item.role) as 'Owner' | 'Manager' | 'Member',  // 将数字角色转换为字符串
      joinedAt: item.creationTime || item.joinedAt,  // API 返回的是 creationTime
      creationTime: item.creationTime
    })) : []
  } catch (error) {
    console.error('刷新团队成员失败:', error)
  } finally {
    memberLoading.value = false
  }
}

// Add member - open dialog
const handleAddMember = () => {
  addMemberForm.userId = ''
  addMemberForm.role = 'Member'
  addMemberDialogVisible.value = true
  searchUsers()
}

// Search users
const searchUsers = async (query?: string) => {
  userSearchLoading.value = true
  try {
    const res = await userApi.getUserList({
      filter: query,
      skipCount: 0,
      maxResultCount: 20,
    })
    userList.value = res.items
  } catch (error) {
    console.error('搜索用户失败:', error)
  } finally {
    userSearchLoading.value = false
  }
}

// Submit add member
const handleAddMemberSubmit = async () => {
  const valid = await addMemberFormRef.value?.validate().catch(() => false)
  if (!valid || !currentTeam.value) return

  addMemberLoading.value = true
  try {
    await teamApi.addTeamMember(currentTeam.value.id, {
      userId: addMemberForm.userId,
      role: getTeamRoleValue(addMemberForm.role),  // 转换为枚举数字值
    })
    ElMessage.success('添加成员成功')
    addMemberDialogVisible.value = false
    refreshMembers()
  } catch (error) {
    console.error('添加成员失败:', error)
  } finally {
    addMemberLoading.value = false
  }
}

// Update member role (仅管理员/成员之间切换，不含所有者)
const handleUpdateRole = async (member: TeamMemberDto, newRole: string) => {
  if (!currentTeam.value) return

  const memberName = member.userName || member.userId || '该成员'
  try {
    await ElMessageBox.confirm(
      `确定要将 ${memberName} 的角色改为 ${getRoleDisplayName(newRole)} 吗？`,
      '确认修改',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await teamApi.updateTeamMember(currentTeam.value.id, member.userId, {
      role: getTeamRoleValue(newRole),  // 转换为枚举数字值
    })
    ElMessage.success('角色更新成功')
    refreshMembers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新角色失败:', error)
    }
  }
}

// 转移所有者
const handleTransferOwnership = async (member: TeamMemberDto) => {
  if (!currentTeam.value) return

  const memberName = member.userName || member.userId || '该成员'
  try {
    await ElMessageBox.confirm(
      `确定要将团队所有者转让给 ${memberName} 吗？转让后您将变为普通成员。`,
      '转让所有者',
      {
        confirmButtonText: '确认转让',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )

    await teamApi.transferOwnership(currentTeam.value.id, {
      teamId: currentTeam.value.id,
      newOwnerUserId: member.userId,
    })
    ElMessage.success('所有者转让成功')
    refreshMembers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('转让所有者失败:', error)
    }
  }
}

// 判断当前登录用户是否是团队所有者
const isCurrentUserOwner = computed(() => {
  const currentUserId = userStore.currentUser?.id
  if (!currentUserId) return false
  return members.value.some(m => m.userId === currentUserId && m.role === 'Owner')
})

// Remove member
const handleRemoveMember = async (member: TeamMemberDto) => {
  if (!currentTeam.value) return

  const memberName = member.userName || member.email || member.userId || '该成员'
  try {
    await ElMessageBox.confirm(
      `确定要将 ${memberName} 移出团队吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await teamApi.removeTeamMember(currentTeam.value.id, member.userId)
    ElMessage.success('移除成员成功')
    refreshMembers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除成员失败:', error)
    }
  }
}

// Get role tag type
const getRoleType = (role: string | number) => {
  const r = typeof role === 'number' ? getTeamRoleText(role) : role
  switch (r) {
    case 'Owner':
      return 'danger'
    case 'Manager':
      return 'warning'
    default:
      return 'info'
  }
}

// Get role name (使用类型文件中的辅助函数)
const getRoleDisplayName = (role: string | number) => {
  return getTeamRoleName(role)
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="teams-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">团队管理</h2>
      <el-button v-if="canManage" type="primary" @click="handleCreateTeam">
        新建团队
      </el-button>
    </div>

    <!-- Table -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="name" label="团队名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
        <el-table-column prop="creationTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.creationTime).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canManage" type="primary" link size="small" @click="handleEditTeam(row)">
              编辑
            </el-button>
            <el-button v-if="canView" type="primary" link size="small" @click="handleViewMembers(row)">
              管理成员
            </el-button>
            <el-button v-if="canManage" type="danger" link size="small" @click="handleDeleteTeam(row)">
              删除
            </el-button>
            <el-button v-if="!canManage && !canView" type="primary" link size="small" disabled>
              无操作权限
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="searchParams.skipCount"
          v-model:page-size="searchParams.maxResultCount"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- Members Dialog -->
    <el-dialog
      v-model="memberDialogVisible"
      width="900px"
      destroy-on-close
      class="member-dialog"
    >
      <template #header>
        <div class="member-dialog-header">
          <div class="member-dialog-title">
            <span class="title-text">团队成员</span>
            <el-tag type="primary" effect="plain" size="small" class="team-name-tag">
              {{ currentTeam?.name }}
            </el-tag>
          </div>
          <el-button v-if="canManage" type="primary" @click="handleAddMember">
            <el-icon style="margin-right: 4px;"><Plus /></el-icon>
            添加成员
          </el-button>
        </div>
      </template>
      
      <el-skeleton :loading="memberLoading" :rows="5" animated>
        <template #default>
          <el-table :data="members" stripe class="member-table">
            <el-table-column label="用户名" min-width="200">
              <template #default="{ row }">
                <div class="member-info">
                  <el-avatar :size="28" class="member-avatar">
                    {{ (row.userName || row.userId || '?').charAt(0).toUpperCase() }}
                  </el-avatar>
                  <span class="member-name">{{ row.userName || row.email || row.userId || '未知用户' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="角色" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="getRoleType(row.role)" size="small" effect="light">
                  {{ getRoleDisplayName(row.role) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="加入时间" width="180" align="center">
              <template #default="{ row }">
                <span class="time-text">{{ row.joinedAt ? new Date(row.joinedAt).toLocaleString('zh-CN') : '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="220" align="center" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <!-- 所有者行：只有当前用户是所有者时显示转让按钮 -->
                  <template v-if="row.role === 'Owner'">
                    <el-button
                      v-if="isCurrentUserOwner"
                      type="warning"
                      link
                      size="small"
                      disabled
                    >
                      所有者
                    </el-button>
                  </template>
                  <!-- 非所有者行：显示修改角色 + 转让 + 移除 -->
                  <template v-else>
                    <el-dropdown trigger="click" @command="(cmd: string) => handleUpdateRole(row, cmd)">
                      <el-button type="primary" link size="small">修改角色</el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="Manager" :disabled="row.role === 'Manager'">
                            管理员
                          </el-dropdown-item>
                          <el-dropdown-item command="Member" :disabled="row.role === 'Member'">
                            成员
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                    <el-divider direction="vertical" />
                    <el-button
                      v-if="isCurrentUserOwner"
                      type="warning"
                      link
                      size="small"
                      @click="handleTransferOwnership(row)"
                    >
                      转让所有者
                    </el-button>
                    <el-divider v-if="isCurrentUserOwner" direction="vertical" />
                    <el-button type="danger" link size="small" @click="handleRemoveMember(row)">
                      移除
                    </el-button>
                  </template>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!members.length" description="暂无成员" />
        </template>
      </el-skeleton>
    </el-dialog>

    <!-- Team CRUD Dialog -->
    <el-dialog
      v-model="teamDialogVisible"
      :title="teamDialogTitle"
      width="600px"
      destroy-on-close
      @close="teamFormRef?.resetFields()"
    >
      <el-form
        ref="teamFormRef"
        :model="teamForm"
        :rules="teamFormRules"
        label-width="100px"
      >
        <el-form-item label="团队名称" prop="name">
          <el-input v-model="teamForm.name" placeholder="请输入团队名称" />
        </el-form-item>
        
        <el-form-item label="团队描述" prop="description">
          <el-input
            v-model="teamForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入团队描述（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="teamDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="teamDialogLoading" @click="handleTeamSubmit">
          {{ isEditTeam ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Add Member Dialog -->
    <el-dialog
      v-model="addMemberDialogVisible"
      title="添加团队成员"
      width="500px"
      destroy-on-close
      @close="addMemberFormRef?.resetFields()"
    >
      <el-form
        ref="addMemberFormRef"
        :model="addMemberForm"
        :rules="addMemberRules"
        label-width="80px"
      >
        <el-form-item label="选择用户" prop="userId">
          <el-select
            v-model="addMemberForm.userId"
            filterable
            remote
            reserve-keyword
            placeholder="输入用户名搜索"
            :remote-method="searchUsers"
            :loading="userSearchLoading"
            style="width: 100%"
            class="user-select"
            popper-class="user-select-popper"
          >
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="`${user.userName} (${user.email})`"
              :value="user.id"
            >
              <div class="user-option">
                <el-avatar :size="24" class="user-option-avatar">
                  {{ user.userName.charAt(0).toUpperCase() }}
                </el-avatar>
                <div class="user-option-info">
                  <span class="user-option-name">{{ user.userName }}</span>
                  <span class="user-option-email">{{ user.email }}</span>
                </div>
              </div>
            </el-option>
            <template #prefix v-if="addMemberForm.userId">
              <el-avatar :size="20" class="selected-user-avatar">
                {{ selectedUserDisplay.charAt(0).toUpperCase() }}
              </el-avatar>
            </template>
          </el-select>
        </el-form-item>
        
        <el-form-item label="角色" prop="role">
          <el-select v-model="addMemberForm.role" placeholder="请选择角色" style="width: 100%" class="role-select">
            <el-option label="管理员" value="Manager" />
            <el-option label="成员" value="Member" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addMemberDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addMemberLoading" @click="handleAddMemberSubmit">
          添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.teams-page {
  animation: fadeIn 0.3s ease-out;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: $text-primary;
  margin: 0;
}

.table-card {
  :deep(.el-table) {
    --el-table-header-bg-color: #{$bg-tertiary};
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

// === 成员对话框 ===
.member-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 40px;
}

.member-dialog-title {
  display: flex;
  align-items: center;
  gap: 10px;

  .title-text {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    line-height: 1;
  }

  .team-name-tag {
    font-size: 13px;
  }
}

// 成员表格
.member-table {
  :deep(.el-table__header) {
    th {
      background-color: #f5f7fa;
      color: #606266;
      font-weight: 600;
    }
  }
}

.member-info {
  display: flex;
  align-items: center;
  gap: 10px;

  .member-avatar {
    background: linear-gradient(135deg, #409eff, #66b1ff);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .member-name {
    font-size: 14px;
    color: #303133;
    font-weight: 500;
  }
}

.time-text {
  font-size: 13px;
  color: #909399;
}

// 操作按钮行对齐
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  white-space: nowrap;

  .el-divider--vertical {
    margin: 0 6px;
    height: 14px;
  }

  .el-button {
    padding: 0;
    margin: 0;
  }
}

// === 添加成员对话框 ===
.user-select {
  :deep(.el-input__wrapper) {
    padding-left: 8px;
  }

  :deep(.el-input__prefix) {
    display: flex;
    align-items: center;
    margin-right: 6px;
  }

  :deep(.el-input__inner) {
    color: #000000 !important;
    font-weight: 600;
  }

  :deep(.el-select__placeholder) {
    color: #909399;
  }
}

.selected-user-avatar {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  width: 100%;

  .user-option-avatar {
    background: linear-gradient(135deg, #409eff, #66b1ff);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .user-option-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .user-option-name {
    font-size: 15px;
    color: #000000;
    font-weight: 600;
    line-height: 1.3;
  }

  .user-option-email {
    font-size: 13px;
    color: #606266;
    font-weight: 500;
    line-height: 1.3;
  }
}

:deep(.el-select-dropdown__item) {
  height: auto !important;
  min-height: 56px;
  padding: 8px 12px;
  line-height: normal;
  color: #000000;
  font-weight: 500;
  
  &.selected {
    color: #409eff;
    font-weight: 600;
    background-color: #ecf5ff;
  }
  
  &:hover {
    background-color: #f5f7fa;
  }
}

// 角色选择下拉项样式（单行内容，高度小一些）
:deep(.role-select .el-select-dropdown__item) {
  min-height: 36px;
  font-size: 14px;
  color: #000000;
  font-weight: 600;
}

// 角色选择框
.role-select {
  :deep(.el-input__inner) {
    color: #000000 !important;
    font-weight: 600;
  }

  :deep(.el-select__placeholder) {
    color: #909399;
  }
}

// 全局加深所有选择框文本
:deep(.el-select .el-input__inner) {
  color: #000000 !important;
  font-weight: 600;
}

:deep(.el-input__inner) {
  color: #000000 !important;
  font-weight: 600;
}
</style>

<!-- 非 scoped 样式，用于下拉框 popper（挂载在 body 下） -->
<style lang="scss">
.user-select-popper {
  .el-select-dropdown__item {
    height: auto !important;
    min-height: 64px !important;
    padding: 12px 16px !important;
    line-height: normal;
    display: flex;
    align-items: center;
    
    &.selected {
      background-color: #ecf5ff;
    }
    
    &:hover {
      background-color: #f5f7fa;
    }
  }
}
</style>

