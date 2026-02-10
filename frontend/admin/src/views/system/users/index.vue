<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { UserDto, UserCreateDto, RoleDto, LoginLogDto } from '@/types'
import * as userApi from '@/api/user'
import * as roleApi from '@/api/role'
import * as loginLogApi from '@/api/login-log'

const userStore = useUserStore()

// Permission checks
const canManage = userStore.hasPermission('system.users.manage')

// State
const loading = ref(false)
const tableData = ref<UserDto[]>([])
const total = ref(0)
const roles = ref<RoleDto[]>([])

// Search params
const searchParams = reactive({
  filter: '',
  skipCount: 0,
  maxResultCount: 10,
})

// Dialog state
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogLoading = ref(false)
const isEdit = ref(false)
const editingId = ref('')

const formRef = ref<FormInstance>()
const form = reactive<UserCreateDto>({
  userName: '',
  password: '',
  email: '',
  phoneNumber: '',
  roleIds: [],
  isEnabled: true,
})

const rules: FormRules = {
  userName: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3-50 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
}

// Assign roles dialog
const assignDialogVisible = ref(false)
const assigningUser = ref<UserDto | null>(null)
const assignedRoleIds = ref<string[]>([])

// Login logs dialog
const loginLogsDialogVisible = ref(false)
const loginLogsLoading = ref(false)
const loginLogsData = ref<LoginLogDto[]>([])
const currentUserForLogs = ref<UserDto | null>(null)
const loginLogsTotal = ref(0)
const loginLogsParams = reactive({
  skipCount: 0,
  maxResultCount: 10,
})

// Fetch data
const fetchData = async () => {
  loading.value = true
  try {
    const res = await userApi.getUserList(searchParams)
    tableData.value = res.items
    total.value = res.totalCount
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchRoles = async () => {
  try {
    const res = await roleApi.getRoleList({ maxResultCount: 100 })
    roles.value = res.items
  } catch {
    // Ignore
  }
}

// Search
const handleSearch = () => {
  searchParams.skipCount = 0
  fetchData()
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

// Create user
const handleCreate = () => {
  isEdit.value = false
  dialogTitle.value = '新建用户'
  Object.assign(form, {
    userName: '',
    password: '',
    email: '',
    phoneNumber: '',
    roleIds: [],
    isEnabled: true,
  })
  dialogVisible.value = true
}

// Edit user
const handleEdit = (row: UserDto) => {
  isEdit.value = true
  editingId.value = row.id
  dialogTitle.value = '编辑用户'
  // Map roleNames to roleIds
  const roleIds = row.roleNames && roles.value 
    ? roles.value.filter(r => row.roleNames.includes(r.roleName)).map(r => r.id)
    : []
  Object.assign(form, {
    userName: row.userName,
    password: '',
    email: row.email,
    phoneNumber: row.phoneNumber || '',
    roleIds: roleIds,
    isEnabled: row.isEnabled,
  })
  dialogVisible.value = true
}

// Submit form
const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  dialogLoading.value = true
  try {
    if (isEdit.value) {
      await userApi.updateUser(editingId.value, {
        email: form.email,
        phoneNumber: form.phoneNumber,
      })
      ElMessage.success('用户更新成功')
    } else {
      await userApi.createUser(form)
      ElMessage.success('用户创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('用户操作失败:', error)
  } finally {
    dialogLoading.value = false
  }
}

// Toggle user status
const handleToggleStatus = async (row: UserDto) => {
  if (row.id === userStore.currentUser?.id) {
    ElMessage.warning('不能停用当前登录用户')
    return
  }

  try {
    if (row.isEnabled) {
      await userApi.deactivateUser(row.id)
      ElMessage.success('用户已停用')
    } else {
      await userApi.activateUser(row.id)
      ElMessage.success('用户已启用')
    }
    fetchData()
  } catch (error) {
    console.error('切换用户状态失败:', error)
  }
}

// Delete user
const handleDelete = async (row: UserDto) => {
  if (row.id === userStore.currentUser?.id) {
    ElMessage.warning('不能删除当前登录用户')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除用户 "${row.userName}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await userApi.deleteUser(row.id)
    ElMessage.success('用户删除成功')
    fetchData()
  } catch {
    // User cancelled or error
  }
}

// Reset password
const handleResetPassword = async (row: UserDto) => {
  try {
    await ElMessageBox.confirm(`确定要重置用户 "${row.userName}" 的密码吗？`, '重置密码', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await userApi.resetPassword(row.id)
    ElMessage.success('密码重置成功')
  } catch {
    // User cancelled or error
  }
}

// Assign roles
const handleAssignRoles = (row: UserDto) => {
  assigningUser.value = row
  // Map roleNames to roleIds
  assignedRoleIds.value = row.roleNames && roles.value
    ? roles.value.filter(r => row.roleNames.includes(r.roleName)).map(r => r.id)
    : []
  assignDialogVisible.value = true
}

const submitAssignRoles = async () => {
  if (!assigningUser.value) return

  dialogLoading.value = true
  try {
    await userApi.assignRoles(assigningUser.value.id, {
      userId: assigningUser.value.id,
      roleIds: assignedRoleIds.value,
    })
    ElMessage.success('角色分配成功')
    assignDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('角色分配失败:', error)
  } finally {
    dialogLoading.value = false
  }
}

// View login logs
const handleViewLoginLogs = async (row: UserDto) => {
  currentUserForLogs.value = row
  loginLogsDialogVisible.value = true
  loginLogsParams.skipCount = 0
  await fetchLoginLogs()
}

const fetchLoginLogs = async () => {
  if (!currentUserForLogs.value) return
  
  loginLogsLoading.value = true
  try {
    const res = await loginLogApi.getUserLoginLogs(currentUserForLogs.value.id, loginLogsParams)
    loginLogsData.value = res.items
    loginLogsTotal.value = res.totalCount
  } catch (error) {
    console.error('获取登录记录失败:', error)
  } finally {
    loginLogsLoading.value = false
  }
}

const handleLoginLogsPageChange = (page: number) => {
  loginLogsParams.skipCount = (page - 1) * loginLogsParams.maxResultCount
  fetchLoginLogs()
}

const handleLoginLogsSizeChange = (size: number) => {
  loginLogsParams.maxResultCount = size
  loginLogsParams.skipCount = 0
  fetchLoginLogs()
}

// Get login status text (0=成功, 1=失败)
const getLoginStatusText = (status: number) => {
  return status === 0 ? '成功' : '失败'
}

// Get login status type (0=成功, 1=失败)
const getLoginStatusType = (status: number) => {
  return status === 0 ? 'success' : 'danger'
}

onMounted(() => {
  fetchData()
  fetchRoles()
})
</script>

<template>
  <div class="users-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-button v-if="canManage" type="primary" :icon="'Plus'" @click="handleCreate">新建用户</el-button>
    </div>

    <!-- Search -->
    <el-card class="search-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="关键字">
          <el-input v-model="searchParams.filter" placeholder="用户名/邮箱" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="handleSearch">搜索</el-button>
          <el-button
            :icon="'Refresh'"
            @click="searchParams.filter = ''; handleSearch()"
            >重置</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="userName" label="用户名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="phoneNumber" label="手机号" min-width="140" />
        <el-table-column label="角色" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="roleName in row.roleNames" :key="roleName" size="small" class="role-tag">
              {{ roleName }}
            </el-tag>
            <span v-if="!row.roleNames?.length" class="text-muted">无角色</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small">
              {{ row.isEnabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creationTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ row.creationTime ? new Date(row.creationTime).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canManage" type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canManage" type="primary" link size="small" @click="handleAssignRoles(row)"
              >分配角色</el-button
            >
            <el-button type="info" link size="small" @click="handleViewLoginLogs(row)">登录记录</el-button>
            <el-button v-if="canManage" type="warning" link size="small" @click="handleToggleStatus(row)">
              {{ row.isEnabled ? '停用' : '启用' }}
            </el-button>
            <el-button v-if="canManage" type="warning" link size="small" @click="handleResetPassword(row)"
              >重置密码</el-button
            >
            <el-button v-if="canManage" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
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

    <!-- Create/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="userName">
          <el-input v-model="form.userName" :disabled="isEdit" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phoneNumber">
          <el-input v-model="form.phoneNumber" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="角色">
          <el-select v-model="form.roleIds" multiple placeholder="请选择角色" style="width: 100%">
            <el-option v-for="role in roles" :key="role.id" :label="role.roleName" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.isEnabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Assign Roles Dialog -->
    <el-dialog v-model="assignDialogVisible" title="分配角色" width="500px" destroy-on-close>
      <div v-if="assigningUser" class="assign-info">
        <span>为用户</span>
        <strong>{{ assigningUser.userName }}</strong>
        <span>分配角色：</span>
      </div>
      <el-checkbox-group v-model="assignedRoleIds" class="role-checkbox-group">
        <el-checkbox v-for="role in roles" :key="role.id" :value="role.id" :label="role.id" class="role-checkbox">
          <div class="role-info">
            <span class="role-name">{{ role.roleName }}</span>
            <span class="role-code">{{ role.roleCode }}</span>
          </div>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="submitAssignRoles">确定</el-button>
      </template>
    </el-dialog>

    <!-- Login Logs Dialog -->
    <el-dialog
      v-model="loginLogsDialogVisible"
      :title="`登录记录 - ${currentUserForLogs?.userName}`"
      width="1000px"
      destroy-on-close
    >
      <el-table v-loading="loginLogsLoading" :data="loginLogsData" stripe max-height="500">
        <el-table-column prop="loginTime" label="登录时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.loginTime).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getLoginStatusType(row.loginStatus)" size="small">
              {{ getLoginStatusText(row.loginStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="loginIp" label="登录IP" width="140" />
        <el-table-column prop="loginLocation" label="登录地点" width="140" show-overflow-tooltip />
        <el-table-column prop="browser" label="浏览器" width="120" show-overflow-tooltip />
        <el-table-column prop="os" label="操作系统" width="120" show-overflow-tooltip />
        <el-table-column prop="deviceType" label="设备类型" width="100" />
        <el-table-column prop="failureReason" label="失败原因" min-width="150" show-overflow-tooltip />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="loginLogsParams.skipCount"
          v-model:page-size="loginLogsParams.maxResultCount"
          :page-sizes="[10, 20, 50, 100]"
          :total="loginLogsTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handleLoginLogsPageChange"
          @size-change="handleLoginLogsSizeChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.users-page {
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

.search-card {
  margin-bottom: 20px;

  :deep(.el-card__body) {
    padding-bottom: 4px;
  }
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

.role-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.assign-info {
  margin-bottom: 20px;
  color: #374151;
  font-size: 15px;

  strong {
    color: $primary-color;
    margin: 0 4px;
    font-size: 16px;
  }
}

.role-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.role-checkbox {
  :deep(.el-checkbox__label) {
    display: flex;
    align-items: center;
  }
  
  :deep(.el-checkbox__input) {
    .el-checkbox__inner {
      width: 18px;
      height: 18px;
      border-width: 2px;
    }
  }
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.role-name {
  color: #1f2937;
  font-weight: 600;
  font-size: 15px;
}

.role-code {
  font-size: 13px;
  color: #6b7280;
  font-family: 'JetBrains Mono', monospace;
}
</style>

