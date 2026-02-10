<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { RoleDto, RoleCreateDto, PermissionDefinitionTreeDto } from '@/types'
import * as roleApi from '@/api/role'
import * as permissionApi from '@/api/permission'

const userStore = useUserStore()
const canManage = userStore.hasPermission('system.roles.manage')

// State
const loading = ref(false)
const tableData = ref<RoleDto[]>([])
const total = ref(0)
const permissionTree = ref<PermissionDefinitionTreeDto | null>(null)

// Search params
const searchParams = reactive({
  filter: '',
  roleType: '',
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
const form = reactive<RoleCreateDto>({
  roleName: '',
  roleCode: '',
  description: '',
})

const rules: FormRules = {
  roleName: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 50, message: '角色名称长度在 2-50 个字符', trigger: 'blur' },
  ],
  roleCode: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]*$/, message: '角色编码必须以小写字母开头，只能包含小写字母、数字和下划线', trigger: 'blur' },
  ],
}

// Permission dialog
const permissionDialogVisible = ref(false)
const currentRole = ref<RoleDto | null>(null)
const rolePermissions = ref<string[]>([])
const permissionLoading = ref(false)

// Fetch data
const fetchData = async () => {
  loading.value = true
  try {
    const res = await roleApi.getRoleList(searchParams)
    tableData.value = res.items
    total.value = res.totalCount
  } catch (error) {
    console.error('获取角色列表失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchPermissionTree = async () => {
  try {
    permissionTree.value = await permissionApi.getPermissionDefinitions()
  } catch {
    // Ignore - permission tree not available
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

// Create role
const handleCreate = () => {
  isEdit.value = false
  dialogTitle.value = '新建角色'
  Object.assign(form, {
    roleName: '',
    roleCode: '',
    description: '',
  })
  dialogVisible.value = true
}

// Edit role
const handleEdit = (row: RoleDto) => {
  isEdit.value = true
  editingId.value = row.id
  dialogTitle.value = '编辑角色'
  Object.assign(form, {
    roleName: row.roleName,
    roleCode: row.roleCode,
    description: row.description || '',
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
      await roleApi.updateRole(editingId.value, {
        roleName: form.roleName,
        description: form.description,
      })
      ElMessage.success('角色更新成功')
    } else {
      await roleApi.createRole(form)
      ElMessage.success('角色创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('角色操作失败:', error)
  } finally {
    dialogLoading.value = false
  }
}

// Delete role
const handleDelete = async (row: RoleDto) => {
  if (row.isSystem) {
    ElMessage.warning('系统角色不能删除')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除角色 "${row.roleName}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await roleApi.deleteRole(row.id)
    ElMessage.success('角色删除成功')
    fetchData()
  } catch {
    // User cancelled or error
  }
}

// 获取权限树中所有有效的权限code
const getValidPermissionCodes = (): Set<string> => {
  const codes = new Set<string>()
  if (!permissionTree.value) return codes
  
  for (const module of permissionTree.value) {
    if (module.groups) {
      for (const group of module.groups) {
        if (group.permissions) {
          for (const perm of group.permissions) {
            codes.add(perm.code)
          }
        }
      }
    }
  }
  return codes
}

// Manage permissions
const handlePermissions = async (row: RoleDto) => {
  if (row.isSystem) {
    ElMessage.warning('系统角色权限不可修改')
    return
  }

  currentRole.value = row
  permissionLoading.value = true
  permissionDialogVisible.value = true

  try {
    const permissions = await roleApi.getRolePermissions(row.id)
    // 过滤掉不在权限定义树中的权限（如 '*' 通配符）
    const validCodes = getValidPermissionCodes()
    rolePermissions.value = permissions.filter(code => validCodes.has(code))
  } catch (error) {
    console.error('获取角色权限失败:', error)
  } finally {
    permissionLoading.value = false
  }
}

// Save permissions
const savePermissions = async () => {
  if (!currentRole.value) return

  permissionLoading.value = true
  try {
    await roleApi.assignRolePermissions(currentRole.value.id, {
      permissionCodes: rolePermissions.value,
    })
    ElMessage.success('权限保存成功')
    permissionDialogVisible.value = false
  } catch (error) {
    console.error('保存权限失败:', error)
  } finally {
    permissionLoading.value = false
  }
}

// Check if permission is selected
const isPermissionSelected = (code: string) => {
  return rolePermissions.value.includes(code)
}

// Toggle permission
const togglePermission = (code: string) => {
  const index = rolePermissions.value.indexOf(code)
  if (index > -1) {
    rolePermissions.value.splice(index, 1)
  } else {
    rolePermissions.value.push(code)
  }
}

// Select all in group
const selectAllInGroup = (groupPermissions: { code: string }[]) => {
  groupPermissions.forEach((p) => {
    if (!rolePermissions.value.includes(p.code)) {
      rolePermissions.value.push(p.code)
    }
  })
}

// Deselect all in group
const deselectAllInGroup = (groupPermissions: { code: string }[]) => {
  groupPermissions.forEach((p) => {
    const index = rolePermissions.value.indexOf(p.code)
    if (index > -1) {
      rolePermissions.value.splice(index, 1)
    }
  })
}

// Check if all in group selected
const isAllGroupSelected = (groupPermissions: { code: string }[]) => {
  return groupPermissions.every((p) => rolePermissions.value.includes(p.code))
}

// Check if some in group selected
const isSomeGroupSelected = (groupPermissions: { code: string }[]) => {
  return groupPermissions.some((p) => rolePermissions.value.includes(p.code)) && !isAllGroupSelected(groupPermissions)
}

onMounted(() => {
  fetchData()
  fetchPermissionTree()
})
</script>

<template>
  <div class="roles-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">角色管理</h2>
      <el-button v-if="canManage" type="primary" :icon="'Plus'" @click="handleCreate">新建角色</el-button>
    </div>

    <!-- Search -->
    <el-card class="search-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="关键字">
          <el-input v-model="searchParams.filter" placeholder="角色名称/编码" clearable style="width: 200px" />
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
        <el-table-column prop="roleName" label="角色名称" min-width="150" />
        <el-table-column prop="roleCode" label="角色编码" min-width="150">
          <template #default="{ row }">
            <code class="code-text">{{ row.roleCode }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isSystem ? 'warning' : 'success'" size="small">
              {{ row.isSystem ? '系统' : '自定义' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.creationTime).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canManage" type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canManage" type="primary" link size="small" @click="handlePermissions(row)"
              >权限配置</el-button
            >
            <el-button
              v-if="canManage && !row.isSystem"
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
              >删除</el-button
            >
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
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="form.roleCode" :disabled="isEdit" placeholder="请输入角色编码，如：admin" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入角色描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Permission Dialog -->
    <el-dialog
      v-model="permissionDialogVisible"
      :title="`权限配置 - ${currentRole?.roleName}`"
      width="800px"
      destroy-on-close
    >
      <el-skeleton :loading="permissionLoading" :rows="10" animated>
        <template #default>
          <div class="permission-tree">
            <el-collapse v-if="permissionTree?.length">
              <el-collapse-item v-for="module in permissionTree" :key="module.code" :name="module.code">
                <template #title>
                  <div class="module-title">
                    <el-icon><Folder /></el-icon>
                    <span>{{ module.displayName }}</span>
                    <span class="module-code">{{ module.code }}</span>
                  </div>
                </template>
                <div class="permission-groups">
                  <div v-for="group in module.groups" :key="group.code" class="permission-group">
                    <div class="group-header">
                      <el-checkbox
                        :model-value="isAllGroupSelected(group.permissions)"
                        :indeterminate="isSomeGroupSelected(group.permissions)"
                        @change="(val) => val ? selectAllInGroup(group.permissions) : deselectAllInGroup(group.permissions)"
                      >
                        <span class="group-title">{{ group.displayName }}</span>
                      </el-checkbox>
                      <span class="group-code">{{ group.code }}</span>
                    </div>
                    <div class="group-permissions">
                      <el-checkbox
                        v-for="permission in group.permissions"
                        :key="permission.code"
                        :model-value="isPermissionSelected(permission.code)"
                        @change="togglePermission(permission.code)"
                      >
                        <span class="permission-name">{{ permission.displayName }}</span>
                        <code class="permission-code">{{ permission.code }}</code>
                      </el-checkbox>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
            <el-empty v-else description="暂无权限数据" />
          </div>
        </template>
      </el-skeleton>
      <template #footer>
        <div class="dialog-footer">
          <span class="selected-count">已选择 {{ rolePermissions.length }} 个权限</span>
          <div>
            <el-button @click="permissionDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="permissionLoading" @click="savePermissions">保存</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.roles-page {
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

.code-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: $bg-tertiary;
  padding: 2px 8px;
  border-radius: 4px;
  color: $text-secondary;
}

.permission-tree {
  max-height: 500px;
  overflow-y: auto;
  background: #1e293b;
  padding: 16px;
  border-radius: $radius-md;
  border: 1px solid rgba(71, 85, 105, 0.5);
  
  :deep(.el-collapse) {
    border: none;
  }
  
  :deep(.el-collapse-item__header) {
    height: auto;
    line-height: 1.6;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%);
    border: 2px solid rgba(59, 130, 246, 0.35);
    border-radius: $radius-md;
    margin-bottom: 14px;
    font-weight: 700;
    color: #ffffff;
    font-size: 15px;
    
    &:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.22) 0%, rgba(59, 130, 246, 0.12) 100%);
      border-color: rgba(59, 130, 246, 0.5);
    }
  }
  
  :deep(.el-collapse-item__wrap) {
    background: transparent;
    border: none;
  }
  
  :deep(.el-collapse-item__content) {
    padding: 0 0 16px 0;
  }
}

.module-title {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
  font-weight: 700;
  font-size: 16px;
  
  .el-icon {
    color: #60a5fa;
    font-size: 20px;
  }
}

.module-code {
  font-size: 12px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  margin-left: auto;
  background: rgba(59, 130, 246, 0.25);
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid rgba(59, 130, 246, 0.4);
  font-weight: 500;
}

.permission-groups {
  padding: 0 16px;
}

.permission-group {
  margin-bottom: 16px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%);
  border: 2px solid rgba(71, 85, 105, 0.6);
  border-radius: $radius-md;
  padding: 18px;
  transition: all $transition-fast;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  &:hover {
    background: linear-gradient(135deg, rgba(15, 23, 42, 1) 0%, rgba(30, 41, 59, 0.95) 100%);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.3);
  
  :deep(.el-checkbox) {
    font-weight: 600;
  }
  
  :deep(.el-checkbox__label) {
    font-size: 15px;
    color: #ffffff;
    font-weight: 600;
  }
  
  :deep(.el-checkbox__input) {
    .el-checkbox__inner {
      width: 18px;
      height: 18px;
      border-width: 2px;
    }
  }
}

.group-title {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}

.group-code {
  font-size: 12px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(59, 130, 246, 0.2);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  font-weight: 500;
}

.group-permissions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 32px;

  :deep(.el-checkbox) {
    display: flex;
    align-items: flex-start;
    height: auto;
    padding: 10px 14px;
    border-radius: 6px;
    transition: all $transition-fast;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid transparent;
    
    &:hover {
      background: rgba(59, 130, 246, 0.12);
      border-color: rgba(59, 130, 246, 0.3);
    }
  }

  :deep(.el-checkbox__label) {
    display: flex;
    flex-direction: column;
    gap: 5px;
    white-space: normal;
    line-height: 1.5;
    color: #e2e8f0;
    font-weight: 500;
  }
  
  :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: #ffffff;
    font-weight: 600;
  }
  
  :deep(.el-checkbox__input) {
    .el-checkbox__inner {
      width: 16px;
      height: 16px;
      border-width: 2px;
    }
  }
}

.permission-name {
  font-size: 14px;
  color: #f1f5f9;
  font-weight: 600;
}

.permission-code {
  font-size: 11px;
  color: #cbd5e1;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(15, 23, 42, 0.8);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(71, 85, 105, 0.5);
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-count {
  font-size: 13px;
  color: $text-secondary;
}
</style>
