<template>
  <div class="user-page">
    <header class="page-header">
      <div class="page-heading">
        <button class="btn-back" @click="goBack">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          返回
        </button>
        <div>
          <h1 class="page-title">用户管理</h1>
          <p class="page-subtitle">租户内用户生命周期与归属管理</p>
        </div>
      </div>
      <div class="page-actions">
        <button
          v-if="hasManagePermission"
          class="btn primary"
          @click="openCreate"
        >
          新建用户
        </button>
      </div>
    </header>

    <section class="main-layout">
      <div class="card">
        <div class="card-header">
          <div class="card-title">用户列表</div>
          <div class="card-toolbar">
            <div class="input-wrap">
              <input
                v-model="searchKeyword"
                type="text"
                class="input"
                placeholder="搜索用户名 / 邮箱 / 手机号"
              />
            </div>
            <div class="filter-group">
              <select v-model="filterStatus" class="select">
                <option value="">全部状态</option>
                <option value="true">启用</option>
                <option value="false">停用</option>
              </select>
            </div>
          </div>
        </div>

        <div class="table-shell" :class="{ loading }">
          <div class="table-head">
            <div class="th sortable" @click="setSort('userName')">
              用户名
              <span class="sort" :class="sortIcon('userName')"></span>
            </div>
            <div class="th">邮箱</div>
            <div class="th">手机号</div>
            <div class="th sortable center" @click="setSort('isEnabled')">
              状态
              <span class="sort" :class="sortIcon('isEnabled')"></span>
            </div>
            <div class="th">角色</div>
            <div class="th sortable" @click="setSort('creationTime')">
              创建时间
              <span class="sort" :class="sortIcon('creationTime')"></span>
            </div>
            <div class="th actions">操作</div>
          </div>

          <div v-if="loading" class="table-empty">加载中...</div>
          <div v-else-if="!pagedUsers.length" class="table-empty">暂无数据</div>
          <div v-else class="table-body">
            <div
              v-for="row in pagedUsers"
              :key="row.id"
              class="tr"
            >
              <div class="td name-cell">
                <div class="name">{{ row.userName }}</div>
                <div class="subline" v-if="row.displayName">
                  {{ row.displayName }}
                </div>
              </div>
              <div class="td muted">{{ row.email || '—' }}</div>
              <div class="td muted">{{ row.phoneNumber || '—' }}</div>
              <div class="td center">
                <span
                  class="tag"
                  :class="row.isEnabled ? 'tag-enabled' : 'tag-disabled'"
                >
                  {{ row.isEnabled ? '启用' : '停用' }}
                </span>
              </div>
              <div class="td">
                <div class="role-tags" v-if="row.roleNames && row.roleNames.length">
                  <span
                    v-for="(roleName, index) in row.roleNames.slice(0, 2)"
                    :key="index"
                    class="role-tag"
                  >
                    {{ roleName }}
                  </span>
                  <span v-if="row.roleNames.length > 2" class="role-tag muted">
                    +{{ row.roleNames.length - 2 }}
                  </span>
                </div>
                <span v-else class="muted">—</span>
              </div>
              <div class="td muted">{{ formatDate(row.creationTime) || '—' }}</div>
              <div class="td actions">
                <button
                  v-if="hasManagePermission"
                  class="link"
                  @click.stop="openEdit(row)"
                >
                  编辑
                </button>
                <template v-if="hasManagePermission">
                  <span class="divider">/</span>
                  <button
                    v-if="row.isEnabled"
                    class="link warning"
                    :disabled="isCurrentUser(row.id)"
                    @click.stop="handleToggleStatus(row, false)"
                  >
                    停用
                  </button>
                  <button
                    v-else
                    class="link success"
                    @click.stop="handleToggleStatus(row, true)"
                  >
                    启用
                  </button>
                  <span class="divider">/</span>
                  <button
                    class="link"
                    @click.stop="handleResetPassword(row)"
                  >
                    重置密码
                  </button>
                  <span class="divider">/</span>
                  <button
                    class="link danger"
                    :disabled="isCurrentUser(row.id)"
                    @click.stop="handleDelete(row)"
                  >
                    删除
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="table-footer">
          <div class="pagination">
            <span class="muted">共 {{ filteredUsers.length }} 条</span>
            <div class="pager">
              <button class="btn ghost" :disabled="pagination.page === 1" @click="prevPage">
                上一页
              </button>
              <span class="page-info">{{ pagination.page }} / {{ totalPages }}</span>
              <button
                class="btn ghost"
                :disabled="pagination.page >= totalPages"
                @click="nextPage"
              >
                下一页
              </button>
              <select v-model.number="pagination.pageSize" class="select">
                <option :value="10">10条/页</option>
                <option :value="20">20条/页</option>
                <option :value="50">50条/页</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- User Edit Drawer -->
    <div v-if="drawerVisible" class="overlay" @click.self="closeDrawer">
      <div class="drawer-panel">
        <div class="drawer-header">
          <div>
            <div class="drawer-title">{{ formMode === 'create' ? '新建用户' : '编辑用户' }}</div>
            <div class="drawer-subtitle" v-if="formMode === 'edit'">
              {{ formModel.userName }}
            </div>
          </div>
          <button class="btn-close" @click="closeDrawer">×</button>
        </div>
        <div class="drawer-body">
          <div class="form-section">
            <div class="section-title">基础信息</div>
            <div class="form-item">
              <label>
                用户名 <span class="required">*</span>
              </label>
              <input
                v-model="formModel.userName"
                type="text"
                class="input"
                placeholder="请输入用户名"
                :disabled="formMode === 'edit'"
              />
              <div v-if="formErrors.userName" class="error">{{ formErrors.userName }}</div>
            </div>
            <div class="form-item">
              <label>
                邮箱 <span class="required">*</span>
              </label>
              <input
                v-model="formModel.email"
                type="email"
                class="input"
                placeholder="请输入邮箱"
              />
              <div v-if="formErrors.email" class="error">{{ formErrors.email }}</div>
            </div>
            <div class="form-item">
              <label>手机号</label>
              <input
                v-model="formModel.phoneNumber"
                type="tel"
                class="input"
                placeholder="请输入手机号"
              />
            </div>
          </div>

        </div>
        <div class="drawer-footer">
          <div></div>
          <div class="footer-actions">
            <button class="btn ghost" @click="closeDrawer">取消</button>
            <button
              class="btn primary"
              :disabled="formSubmitting"
              @click="submitForm"
            >
              {{ formSubmitting ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="confirmVisible" class="overlay" @click.self="confirmVisible = false">
      <div class="modal confirm-modal">
        <div class="modal-header">
          <div class="modal-title">{{ confirmTitle }}</div>
        </div>
        <div class="modal-body">
          <p>{{ confirmMessage }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn ghost" @click="confirmVisible = false">取消</button>
          <button
            class="btn"
            :class="confirmType === 'delete' ? 'danger' : 'primary'"
            @click="confirmAction"
          >
            {{ confirmType === 'delete' ? '删除' : '确定' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { SYSTEM_PERMISSIONS } from '@/permission/permission.constants'
import { usePermissionStore } from '@/stores/permission'
import { useAuthStore } from '@/stores/auth'
import { sysApi } from '@/api/sys.api'

const router = useRouter()

const permissionStore = usePermissionStore()
const authStore = useAuthStore()

const hasManagePermission = computed(() => permissionStore.has(SYSTEM_PERMISSIONS.USERS_MANAGE))

const loading = ref(false)
const userList = ref([])
const searchKeyword = ref('')
const filterStatus = ref('')
const pagination = reactive({
  page: 1,
  pageSize: 10,
})
const sortState = ref({ prop: 'creationTime', order: 'descending' })

const drawerVisible = ref(false)
const formMode = ref('create')
const formSubmitting = ref(false)
const formModel = reactive({
  id: null,
  userName: '',
  email: '',
  phoneNumber: '',
  isEnabled: true,
})
const formErrors = reactive({
  userName: '',
  email: '',
})

const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmType = ref('delete')
const confirmCallback = ref(null)

const filteredUsers = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  return userList.value.filter((item) => {
    const matchKw = !kw ||
      (item.userName && item.userName.toLowerCase().includes(kw)) ||
      (item.email && item.email.toLowerCase().includes(kw)) ||
      (item.phoneNumber && item.phoneNumber && item.phoneNumber.includes(kw))
    const matchStatus = filterStatus.value === '' || String(item.isEnabled) === filterStatus.value
    return matchKw && matchStatus
  })
})

const sortedUsers = computed(() => {
  const list = [...filteredUsers.value]
  const { prop, order } = sortState.value
  if (!prop || order === 'normal') return list
  return list.sort((a, b) => {
    let va = a[prop]
    let vb = b[prop]
    if (prop === 'creationTime') {
      va = va ? new Date(va).getTime() : 0
      vb = vb ? new Date(vb).getTime() : 0
    }
    if (va === vb) return 0
    const res = va > vb ? 1 : -1
    return order === 'ascending' ? res : -res
  })
})

const pagedUsers = computed(() => {
  const total = totalPages.value
  if (pagination.page > total) pagination.page = total
  if (pagination.page < 1) pagination.page = 1
  const start = (pagination.page - 1) * pagination.pageSize
  return sortedUsers.value.slice(start, start + pagination.pageSize)
})

const totalPages = computed(() => {
  const total = sortedUsers.value.length
  return Math.max(1, Math.ceil(total / pagination.pageSize) || 1)
})

const normalizeUser = (raw) => {
  if (!raw) return null
  return {
    id: raw.id || raw.userId,
    userName: raw.userName || '',
    displayName: raw.displayName || raw.name || raw.nickName || '',
    email: raw.email || '',
    phoneNumber: raw.phoneNumber || raw.phone || '',
    isEnabled: raw.isEnabled !== undefined ? raw.isEnabled : true,
    roleNames: raw.roleNames || [],
    creationTime: raw.creationTime || raw.createdAt || raw.createTime,
    raw,
  }
}

const loadUserList = async () => {
  loading.value = true
  try {
    const res = await sysApi.user.getUserList({
      filter: searchKeyword.value || null,
      isEnabled: filterStatus.value === '' ? null : filterStatus.value === 'true',
    })
    const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
    userList.value = list.map(normalizeUser).filter(Boolean)
  } catch (error) {
    console.error('加载用户列表失败', error)
    ElMessage.error(error.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const setSort = (prop) => {
  const { prop: current, order } = sortState.value
  const nextOrder =
    current === prop
      ? order === 'descending'
        ? 'ascending'
        : order === 'ascending'
          ? 'normal'
          : 'descending'
      : 'descending'
  sortState.value = { prop, order: nextOrder }
}

const sortIcon = (prop) => {
  if (sortState.value.prop !== prop) return ''
  if (sortState.value.order === 'ascending') return 'asc'
  if (sortState.value.order === 'descending') return 'desc'
  return ''
}

const prevPage = () => {
  if (pagination.page > 1) pagination.page -= 1
}

const nextPage = () => {
  if (pagination.page < totalPages.value) pagination.page += 1
}

const isCurrentUser = (userId) => {
  return authStore.currentUser?.id === userId || authStore.currentUser?.userId === userId
}

const openCreate = () => {
  formMode.value = 'create'
  Object.assign(formModel, {
    id: null,
    userName: '',
    email: '',
    phoneNumber: '',
    isEnabled: true,
  })
  Object.assign(formErrors, {
    userName: '',
    email: '',
  })
  drawerVisible.value = true
}

const openEdit = (user) => {
  formMode.value = 'edit'
  Object.assign(formModel, {
    id: user.id,
    userName: user.userName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    isEnabled: user.isEnabled,
  })
  Object.assign(formErrors, {
    userName: '',
    email: '',
  })
  drawerVisible.value = true
}

const closeDrawer = () => {
  drawerVisible.value = false
}

const validateForm = () => {
  Object.assign(formErrors, {
    userName: '',
    email: '',
  })
  let valid = true
  if (!formModel.userName.trim()) {
    formErrors.userName = '请输入用户名'
    valid = false
  }
  if (!formModel.email.trim()) {
    formErrors.email = '请输入邮箱'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formModel.email)) {
    formErrors.email = '请输入有效的邮箱地址'
    valid = false
  }
  return valid
}

const submitForm = async () => {
  if (!validateForm()) return
  formSubmitting.value = true
  try {
    const payload = {
      userName: formModel.userName.trim(),
      email: formModel.email.trim(),
      phoneNumber: formModel.phoneNumber.trim() || null,
      isEnabled: formModel.isEnabled,
    }
    if (formMode.value === 'create') {
      const res = await sysApi.user.createUser(payload)
      ElMessage.success('用户创建成功')
      // 创建用户后，将返回的用户添加到列表
      if (res) {
        const newUser = normalizeUser(res)
        if (newUser) {
          userList.value.push(newUser)
        }
      }
    } else {
      const res = await sysApi.user.updateUser(formModel.id, payload)
      ElMessage.success('保存成功')
      // 编辑用户后，直接更新列表中对应的数据
      if (res) {
        const updatedUser = normalizeUser(res)
        if (updatedUser) {
          const index = userList.value.findIndex(u => u.id === updatedUser.id)
          if (index !== -1) {
            userList.value[index] = updatedUser
          }
        }
      }
    }
    closeDrawer()
  } catch (error) {
    console.error('提交用户失败', error)
    ElMessage.error(error.message || '提交失败')
  } finally {
    formSubmitting.value = false
  }
}

const handleDelete = (user) => {
  if (isCurrentUser(user.id)) {
    ElMessage.warning('不能删除当前登录用户')
    return
  }
  confirmTitle.value = '确认删除'
  confirmMessage.value = `确定要删除用户 "${user.userName}" 吗？此操作不可恢复。`
  confirmType.value = 'delete'
  confirmCallback.value = async () => {
    try {
      await sysApi.user.deleteUser(user.id)
      ElMessage.success('删除成功')
      await loadUserList()
    } catch (error) {
      console.error('删除用户失败', error)
      ElMessage.error(error.message || '删除失败')
    }
  }
  confirmVisible.value = true
}

const handleToggleStatus = async (user, enable) => {
  if (enable === false && isCurrentUser(user.id)) {
    ElMessage.warning('不能停用当前登录用户')
    return
  }
  
  const action = enable ? '启用' : '停用'
  confirmTitle.value = `确认${action}`
  confirmMessage.value = `确定要${action}用户 "${user.userName}" 吗？`
  confirmType.value = enable ? 'enable' : 'disable'
  confirmCallback.value = async () => {
    try {
      if (enable) {
        await sysApi.user.activateUser(user.id)
      } else {
        await sysApi.user.deactivateUser(user.id)
      }
      ElMessage.success(`${action}成功`)
      await loadUserList()
    } catch (error) {
      console.error(`${action}用户失败`, error)
      ElMessage.error(error.message || `${action}失败`)
    }
  }
  confirmVisible.value = true
}

const handleResetPassword = (user) => {
  confirmTitle.value = '重置密码'
  confirmMessage.value = `确定要重置用户 "${user.userName}" 的密码吗？`
  confirmType.value = 'reset'

  confirmCallback.value = async () => {
    try {
      await sysApi.user.resetPassword(user.id)

      ElMessage.success('密码重置成功')
    } catch (error) {
      console.error('重置密码失败', error)
      ElMessage.error(error.response.data.error.data.Errors[0] || '密码重置失败')
    }
  }

  confirmVisible.value = true
}

const confirmAction = () => {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  confirmVisible.value = false
}

const goBack = () => {
  router.push({ name: 'Timeline' })
}

onMounted(async () => {
  await loadUserList()
})
</script>

<style scoped>
:root {
  --page-bg: #FAFBFC;
  --card-bg: #ffffff;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --primary-color: #0f172a;
  --danger-color: #dc2626;
}

.user-page {
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text);
  font-family: "Inter", "PingFang SC", -apple-system, sans-serif;
}

/* 顶部工具栏 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 48px;
  background: #0f172a;
  position: sticky;
  top: 0;
  z-index: 100;
}

.page-heading {
  display: flex;
  align-items: center;
  gap: 20px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-back:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.page-title {
  margin: 4px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}

.page-subtitle {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-actions .btn.ghost {
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  background: transparent;
}

.page-actions .btn.ghost:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}

.page-actions .btn.primary {
  background: #fff !important;
  color: #0f172a !important;
  border-color: #fff !important;
}

.page-actions .btn.primary:hover:not(:disabled) {
  background: #f1f5f9 !important;
  border-color: #f1f5f9 !important;
  color: #0f172a !important;
}

/* 通用按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  border-color: var(--text);
}

.btn.primary {
  background: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
}

.btn.primary:hover:not(:disabled) {
  background: #1e293b;
}

.btn.ghost {
  background: transparent;
}

.btn.danger {
  color: var(--danger-color);
  border-color: var(--danger-color);
  background: transparent;
}

.btn.danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.08);
}

/* 主内容区 */
.main-layout {
  padding: 32px 48px 48px;
  max-width: 1600px;
  margin: 0 auto;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 28px;
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: #0f172a;
  gap: 16px;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.card-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.input-wrap {
  min-width: 260px;
  flex: 0 0 auto;
}

.input {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.9rem;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.15);
}

.filter-group {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.select {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  min-width: 120px;
  font-size: 0.9rem;
  cursor: pointer;
}

.select option {
  background: #0f172a;
  color: #fff;
}

/* 表格区域 */
.table-shell {
  background: #fff;
}

.table-shell.loading {
  opacity: 0.6;
}

.table-head, .tr {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr 0.7fr 0.8fr 1fr 1.8fr;
  align-items: center;
}

.table-head {
  padding: 14px 28px;
  background: #f8fafc;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border);
}

.th {
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.th.sortable {
  cursor: pointer;
  transition: color 0.18s ease;
}

.th.sortable:hover {
  color: var(--text);
}

.th.center, .td.center {
  justify-content: center;
  text-align: center;
}

.sort {
  width: 8px;
  height: 12px;
  display: inline-block;
  position: relative;
}

.sort::before,
.sort::after {
  content: '';
  position: absolute;
  left: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}

.sort::before {
  top: 0;
  border-bottom: 5px solid #cbd5e1;
}

.sort::after {
  bottom: 0;
  border-top: 5px solid #cbd5e1;
}

.sort.asc::before {
  border-bottom-color: var(--text);
}

.sort.desc::after {
  border-top-color: var(--text);
}

.table-body {
  background: #fff;
}

.tr {
  padding: 16px 28px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tr:hover {
  background: #f8fafc;
}

.tr:last-child {
  border-bottom: none;
}

.td {
  padding: 0 8px;
  font-size: 0.9rem;
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  font-weight: 600;
  color: var(--text);
}

.subline {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.muted {
  color: var(--text-secondary);
}

.tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid transparent;
}

.tag-enabled {
  color: #059669;
  border-color: rgba(5, 150, 105, 0.2);
  background: rgba(5, 150, 105, 0.08);
}

.tag-disabled {
  color: #94a3b8;
  border-color: #e2e8f0;
  background: #f8fafc;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-size: 0.8rem;
  color: var(--text);
}

.role-tag.muted {
  color: var(--text-tertiary);
}

.table-empty {
  padding: 60px 40px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.95rem;
}

.table-footer {
  padding: 16px 28px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pager {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-info {
  color: var(--text);
  font-weight: 500;
}

.pagination .select {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.link {
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.18s ease;
}

.link:hover {
  background: #f1f5f9;
  color: var(--primary-color);
}

.link.danger {
  color: var(--danger-color);
}

.link.danger:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
}

.link.warning {
  color: #d97706;
}

.link.warning:hover {
  background: rgba(217, 119, 6, 0.08);
  color: #b45309;
}

.link.success {
  color: #059669;
}

.link.success:hover {
  background: rgba(5, 150, 105, 0.08);
  color: #047857;
}

.link:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.divider {
  color: #cbd5e1;
  margin: 0 2px;
}

/* 遮罩层 */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 2000;
}

/* 抽屉面板 */
.drawer-panel {
  position: relative;
  width: 640px;
  max-width: 92vw;
  background: #fff;
  border-radius: 28px;
  border: 1px solid var(--border);
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 28px;
  background: #0f172a;
  color: #fff;
}

.drawer-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.drawer-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin-top: 4px;
}

.btn-close {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.18s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.drawer-body {
  padding: 28px;
  overflow: auto;
  flex: 1;
  background: #fff;
}

.form-section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.form-item label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
}

.form-item .input {
  border: 1.5px solid #cbd5e1;
  background: #fff;
  color: var(--text);
  border-radius: 12px;
  height: 44px;
}

.form-item .input:focus {
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.required {
  color: var(--danger-color);
}

.error {
  color: var(--danger-color);
  font-size: 0.8rem;
}

.radio-group {
  display: flex;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: #f1f5f9;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.18s ease;
}

.radio-label:hover {
  background: #e2e8f0;
}

.radio-label:has(input:checked) {
  background: #0f172a;
  color: #fff;
}

.radio-label input[type="radio"] {
  display: none;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-top: 1px solid var(--border);
  background: #fff;
}

.drawer-footer .btn.ghost {
  border-color: var(--border);
  color: var(--text-secondary);
  background: transparent;
}

.drawer-footer .btn.ghost:hover {
  background: #f1f5f9;
  color: var(--text);
  border-color: var(--text);
}

.drawer-footer .btn.primary {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.drawer-footer .btn.primary:hover:not(:disabled) {
  background: #1e293b;
  border-color: #1e293b;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.footer-actions .btn.ghost {
  border-color: #0f172a;
  color: #fff;
  background: #0f172a;
}

.footer-actions .btn.ghost:hover {
  background: #1e293b;
  color: #fff;
  border-color: #1e293b;
}

.footer-actions .btn.primary {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.footer-actions .btn.primary:hover:not(:disabled) {
  background: #1e293b;
  border-color: #1e293b;
}

.footer-actions .btn.primary:disabled {
  opacity: 0.5;
}

/* 确认模态框 */
.modal {
  width: 480px;
  background: #fff;
  border-radius: 28px;
  border: 1px solid var(--border);
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header, .modal-footer {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header {
  background: #0f172a;
  border-bottom: none;
}

.modal-footer {
  border-top: 1px solid var(--border);
  background: #fff;
  justify-content: flex-end;
  gap: 10px;
}

.modal-footer .btn.ghost {
  border-color: #0f172a;
  color: #fff;
  background: #0f172a;
}

.modal-footer .btn.ghost:hover {
  background: #1e293b;
  color: #fff;
  border-color: #1e293b;
}

.modal-footer .btn.primary {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.modal-footer .btn.primary:hover:not(:disabled) {
  background: #1e293b;
  border-color: #1e293b;
}

.modal-footer .btn.danger {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}

.modal-footer .btn.danger:hover {
  background: #b91c1c;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

/* 响应式 */
@media (max-width: 992px) {
  .page-header {
    padding: 16px 24px;
  }
  
  .main-layout {
    padding: 24px;
  }
  
  .card-header {
    padding: 16px 20px;
  }
  
  .table-head, .tr {
    padding-left: 20px;
    padding-right: 20px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
  }
  
  .page-heading {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .main-layout {
    padding: 20px 16px;
  }
  
  .card {
    border-radius: 20px;
  }
  
  .table-head, .tr {
    grid-template-columns: 1fr 1fr 0.8fr;
  }
  
  .th:nth-child(3),
  .th:nth-child(5),
  .th:nth-child(6),
  .td:nth-child(3),
  .td:nth-child(5),
  .td:nth-child(6) {
    display: none;
  }
  
  .drawer-panel {
    border-radius: 20px;
  }
  
  .modal {
    border-radius: 20px;
    margin: 16px;
  }
}
</style>
