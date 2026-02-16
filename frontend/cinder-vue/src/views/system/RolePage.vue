<template>
  <div class="role-page">
    <header class="page-header">
      <div class="page-heading">
        <button class="btn-back" @click="goBack">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          返回
        </button>
        <div>
          <h1 class="page-title">角色管理</h1>
          <p class="page-subtitle">角色列表与权限配置</p>
        </div>
      </div>
      <div class="page-actions">
        <button class="btn ghost" @click="handleExport">导出</button>
        <button
          v-permission="SYSTEM_PERMISSIONS.ROLES_MANAGE"
          class="btn primary"
          @click="openCreate"
        >
          新建角色
        </button>
      </div>
    </header>

    <section class="main-layout">
      <div class="left-pane">
        <div class="card">
          <div class="card-header">
            <div class="card-title">角色列表</div>
            <div class="card-toolbar">
              <div class="input-wrap">
                <input
                  v-model="searchKeyword"
                  type="text"
                  class="input"
                  placeholder="搜索角色名称 / 描述"
                />
              </div>
              <div class="filter-group">
                <button
                  v-for="item in typeFilters"
                  :key="item.value"
                  class="btn tab"
                  :class="{ active: typeFilter === item.value }"
                  @click="typeFilter = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
              <div v-if="selection.length" class="bulk-actions">
                <button class="btn danger ghost" @click="handleBulkDelete">批量删除</button>
                <button class="btn ghost" @click="handleBulkExport">批量导出</button>
              </div>
            </div>
          </div>

          <div class="table-shell" :class="{ loading }">
            <div class="table-head">
              <div class="th checkbox">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              </div>
              <div class="th sortable" @click="setSort('name')">
                角色名称
                <span class="sort" :class="sortIcon('name')"></span>
              </div>
              <div class="th">描述</div>
              <div class="th sortable center" @click="setSort('memberCount')">
                成员数 <span class="sort" :class="sortIcon('memberCount')"></span>
              </div>
              <div class="th sortable center" @click="setSort('permissionCount')">
                权限数 <span class="sort" :class="sortIcon('permissionCount')"></span>
              </div>
              <div class="th actions">操作</div>
            </div>

            <div v-if="loading" class="table-empty">加载中...</div>
            <div v-else-if="!pagedRoles.length" class="table-empty">暂无数据</div>
            <div v-else class="table-body">
              <div
                v-for="row in pagedRoles"
                :key="row.id"
                class="tr"
                :class="{ active: currentRole?.id === row.id }"
                @click="handleRowClick(row)"
              >
                <div class="td checkbox" @click.stop>
                  <input
                    type="checkbox"
                    :checked="isSelected(row)"
                    @change="(e)=>toggleSelectRow(row, e)"
                  />
                </div>
                <div class="td name-cell">
                  <div class="name-block">
                    <div class="name">{{ row.name }}</div>
                    <div class="subline">
                      <span class="code-tag">{{ row.code || '—' }}</span>
                    </div>
                  </div>
                  <span
                    class="tag"
                    :class="row.type === ROLE_TYPES.system ? 'tag-system' : 'tag-custom'"
                  >
                    {{ row.type === ROLE_TYPES.system ? '系统' : '自定义' }}
                  </span>
                </div>
                <div class="td muted ellipsis" :title="row.description || '—'">
                  {{ row.description || '—' }}
                </div>
                <div class="td center">{{ row.memberCount ?? 0 }}</div>
                <div class="td center">{{ row.permissionCount ?? 0 }}</div>
                <div class="td actions">
                  <button class="link" @click.stop="openEdit(row)">编辑</button>
                  <span class="divider">/</span>
                  <button class="link" @click.stop="handleConfigPermission(row)">权限</button>
                  <span class="divider">/</span>
                  <button
                    class="link danger"
                    :disabled="row.type === ROLE_TYPES.system"
                    @click.stop="handleDelete(row)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="table-footer">
            <div class="pagination">
              <span class="muted">共 {{ filteredRoles.length }} 条</span>
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
      </div>

    </section>

    <!-- Permission drawer -->
    <div v-if="permissionDrawerVisible" class="overlay" @click.self="permissionDrawerVisible=false">
      <div class="drawer-panel">
        <div class="drawer-header">
          <div>
            <div class="drawer-title">配置权限</div>
            <div class="drawer-subtitle">
              {{ currentRole?.name || '' }} · 即将新增 {{ diffStats.add }} / 移除 {{ diffStats.remove }}
            </div>
          </div>
          <span class="tag" v-if="currentRole">
            {{ currentRole.type === ROLE_TYPES.system ? '系统角色' : '自定义角色' }}
          </span>
        </div>
        <div class="drawer-body">
          <div class="drawer-left">
            <div v-if="permissionEditHint" class="permission-hint">
              {{ permissionEditHint }}
            </div>
            <div class="module-tabs">
              <button
                v-for="m in permissionModules"
                :key="m.code"
                class="btn tab"
                :class="{ active: activeModule === m.code }"
                @click.stop="switchModule(m.code)"
              >
                {{ m.name || m.code }}
              </button>
            </div>
            <div class="drawer-toolbar">
              <input
                v-model="permissionSearch"
                class="input"
                placeholder="搜索权限名称或编码"
                @input="filterTree"
              />
              <div class="toolbar-actions">
                <button class="link" @click="expandAll">展开</button>
                <button class="link" @click="collapseAll">折叠</button>
                <button 
                  class="link" 
                  :class="{ disabled: !canEditPermissions }"
                  :disabled="!canEditPermissions"
                  @click="clearTreeSelection"
                >清空选择</button>
              </div>
            </div>
            <el-tree
              ref="permissionTreeRef"
              :data="filteredPermissionTree"
              show-checkbox
              node-key="code"
              default-expand-all
              :props="treeProps"
              highlight-current
              class="permission-tree"
              :class="{ 'tree-disabled': !canEditPermissions }"
              :check-strictly="false"
              :render-after-expand="false"
              :default-checked-keys="selectedCodes"
              :filter-node-method="filterPermissionNode"
              @check="handleTreeCheck"
            >
              <template #default="{ data }">
                <span class="tree-node-label">
                  {{ data.label }}
                </span>
              </template>
            </el-tree>
          </div>
          <div class="drawer-right">
            <div class="selected-header">
              <div class="section-title">已选择（{{ selectedCodes.length }}）</div>
              <button 
                v-if="canEditPermissions"
                class="link" 
                @click="clearTreeSelection"
              >清空</button>
            </div>
            <div class="selected-list" v-if="selectedPermissionList.length">
              <div class="selected-item" v-for="item in selectedPermissionList" :key="item.code">
                <div>
                  <div class="name">{{ item.label }}</div>
                  <div class="muted small">{{ item.code }}</div>
                </div>
                <button 
                  v-if="canEditPermissions" 
                  class="link danger" 
                  @click="removePermission(item.code)"
                >移除</button>
              </div>
            </div>
            <div class="empty-hint" v-else>还没有选择任何权限</div>
          </div>
        </div>
        <div class="drawer-footer">
          <div class="diff">
            将新增 <strong>{{ diffStats.add }}</strong>，移除 <strong>{{ diffStats.remove }}</strong>
          </div>
          <div class="footer-actions">
            <button class="btn ghost" @click="permissionDrawerVisible=false">取消</button>
            <button 
              class="btn primary" 
              :disabled="permissionSaving || !canEditPermissions" 
              @click="handleSavePermissions"
            >
              {{ permissionSaving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit dialog -->
    <div v-if="formVisible" class="overlay" @click.self="formVisible=false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">{{ formMode === 'create' ? '新建角色' : '编辑角色' }}</div>
          <button class="link" @click="formVisible=false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>角色名称 <span class="required">*</span></label>
            <input
              v-model="formModel.name"
              class="input"
              placeholder="如：运营管理员"
              maxlength="50"
            />
            <div class="error" v-if="formErrors.name">{{ formErrors.name }}</div>
          </div>
          <div class="form-item">
            <label>角色编码 <span class="required">*</span></label>
            <input
              v-model="formModel.code"
              class="input"
              placeholder="如：ops_admin"
              maxlength="50"
            />
            <div class="error" v-if="formErrors.code">{{ formErrors.code }}</div>
          </div>
          <div class="form-item">
            <label>描述</label>
            <textarea
              v-model="formModel.description"
              class="textarea"
              rows="4"
              maxlength="200"
              placeholder="简要说明角色的职责与适用场景"
            ></textarea>
            <div class="muted small">{{ (formModel.description || '').length }} / 200</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn ghost" @click="formVisible=false">取消</button>
          <button class="btn primary" :disabled="formSubmitting" @click="submitForm">
            {{ formSubmitting ? '保存中…' : (formMode === 'create' ? '创建' : '保存') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="confirmVisible" class="overlay" @click.self="confirmVisible = false">
      <div class="modal confirm-modal">
        <div class="modal-header">
          <div class="modal-title">{{ confirmTitle }}</div>
          <button class="link" @click="confirmVisible = false">✕</button>
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { GrantType, isSystemPermission } from '@/constants/grantType'
import { SYSTEM_PERMISSIONS } from '@/permission/permission.constants'
import { usePermissionStore } from '@/stores/permission'
import { usePermissionCatalogStore } from '@/stores/permissionCatalog'
import { useAuthStore } from '@/stores/auth'
import { sysApi } from '@/api/sys.api'

const router = useRouter()

const ROLE_TYPES = {
  system: 0,
  custom: 1,
}

const permissionStore = usePermissionStore()
const permissionCatalogStore = usePermissionCatalogStore()
const authStore = useAuthStore()

const typeFilters = [
  { label: '全部', value: 'all' },
  { label: '系统', value: 'system' },
  { label: '自定义', value: 'custom' },
]

const loading = ref(false)
const roleList = ref([])
const searchKeyword = ref('')
const typeFilter = ref('all')
const selection = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
})
const sortState = ref({ prop: 'name', order: 'ascending' })

const currentRole = ref(null)
const permissionDrawerVisible = ref(false)
const permissionTreeRef = ref()
const permissionSearch = ref('')
const permissionSaving = ref(false)
const originalPermissionCodes = ref([])
const selectedCodes = ref([])
const permissionModules = computed(() => permissionCatalogStore.modules)
const activeModule = ref('')
const currentUserRoleIds = ref([]) // 当前用户的角色ID列表

// 计算属性：判断是否为系统角色
const isSystemRole = computed(() => {
  return currentRole.value?.type === ROLE_TYPES.system
})

// 计算属性：判断当前用户是否属于该角色
const isCurrentUserInRole = computed(() => {
  if (!currentRole.value?.id || !authStore.currentUser?.id) return false
  return currentUserRoleIds.value.includes(currentRole.value.id)
})

// 计算属性：是否允许编辑
const canEditPermissions = computed(() => {
  return !isSystemRole.value && !isCurrentUserInRole.value
})

// 计算属性：提示文案
const permissionEditHint = computed(() => {
  if (isSystemRole.value) {
    return '系统角色权限由平台维护，租户管理员不可修改'
  }
  if (isCurrentUserInRole.value) {
    return '为避免误操作，不能修改当前用户所属角色的权限'
  }
  return ''
})

const formVisible = ref(false)
const formMode = ref('create')
const formSubmitting = ref(false)
const formModel = reactive({
  id: null,
  name: '',
  code: '',
  type: ROLE_TYPES.custom,
  description: '',
})
const formErrors = reactive({
  name: '',
  code: '',
})

const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmType = ref('delete')
const confirmCallback = ref(null)

const treeProps = {
  children: 'children',
  label: 'label',
  disabled: () => !canEditPermissions.value, // 禁用函数
}

const permissionTree = ref([])

const filteredPermissionTree = computed(() => {
  if (!permissionSearch.value.trim()) return permissionTree.value
  const kw = permissionSearch.value.toLowerCase()
  const filterNodes = (nodes) => nodes
    .map((node) => {
      if (!node.children || node.children.length === 0) {
        return node.label.toLowerCase().includes(kw) || (node.code || '').toLowerCase().includes(kw)
          ? node
          : null
      }
      const matchedChildren = filterNodes(node.children)
      if (matchedChildren.length) {
        return { ...node, children: matchedChildren }
      }
      if (node.label.toLowerCase().includes(kw)) return { ...node, children: [] }
      return null
    })
    .filter(Boolean)
  return filterNodes(permissionTree.value)
})

const flatPermissionMap = computed(() => {
  const map = new Map()
  const walk = (nodes) => {
    nodes.forEach((node) => {
      if (node.children?.length) {
        walk(node.children)
      } else if (node.code) {
        map.set(node.code, node.grantType ?? GrantType.System)
      }
    })
  }
  walk(permissionTree.value)
  return map
})

const filteredRoles = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  return roleList.value.filter((item) => {
    const matchKw = !kw ||
      (item.name && item.name.toLowerCase().includes(kw)) ||
      (item.description && item.description.toLowerCase().includes(kw)) ||
      (item.code && item.code.toLowerCase().includes(kw))
    const matchType =
      typeFilter.value === 'all' ||
      (typeFilter.value === 'system' && item.type === ROLE_TYPES.system) ||
      (typeFilter.value === 'custom' && item.type === ROLE_TYPES.custom)
    return matchKw && matchType
  })
})

const sortedRoles = computed(() => {
  const list = [...filteredRoles.value]
  const { prop, order } = sortState.value
  if (!prop || order === 'normal') return list
  return list.sort((a, b) => {
    const va = a[prop] ?? 0
    const vb = b[prop] ?? 0
    if (va === vb) return 0
    const res = va > vb ? 1 : -1
    return order === 'ascending' ? res : -res
  })
})

const pagedRoles = computed(() => {
  const total = totalPages.value
  if (pagination.page > total) pagination.page = total
  if (pagination.page < 1) pagination.page = 1
  const start = (pagination.page - 1) * pagination.pageSize
  return sortedRoles.value.slice(start, start + pagination.pageSize)
})

const totalPages = computed(() => {
  const total = sortedRoles.value.length
  return Math.max(1, Math.ceil(total / pagination.pageSize) || 1)
})

const isAllSelected = computed(() => {
  const ids = filteredRoles.value.map((r) => r.id)
  return ids.length > 0 && selection.value.length === ids.length
})

const selectedPermissionList = computed(() => {
  const map = new Map()
  // 遍历所有已加载的模块树，而不仅仅是当前模块
  const traverse = (nodes) => {
    nodes.forEach((n) => {
      if (n.children) {
        traverse(n.children)
      } else if (n.code) {
        map.set(n.code, n.label)
      }
    })
  }
  // 遍历所有已加载的模块
  permissionModules.value.forEach((module) => {
    if (permissionCatalogStore.hasTree(module.code)) {
      const moduleTree = permissionCatalogStore.getTree(module.code)
      if (moduleTree) {
        const tree = buildTreeFromModule(moduleTree)
        traverse(tree)
      }
    }
  })
  return selectedCodes.value.map((code) => ({
    code,
    label: map.get(code) || code,
  }))
})

const diffStats = computed(() => {
  const original = new Set(originalPermissionCodes.value)
  const current = new Set(selectedCodes.value)
  let add = 0
  let remove = 0
  current.forEach((c) => {
    if (!original.has(c)) add += 1
  })
  original.forEach((c) => {
    if (!current.has(c)) remove += 1
  })
  return { add, remove }
})

const hasManagePermission = () => permissionStore.has(SYSTEM_PERMISSIONS.ROLES_MANAGE)

const normalizeRole = (raw) => {
  if (!raw) return null
  return {
    id: raw.id ?? raw.roleId ?? raw.key,
    name: raw.roleName ?? raw.name,
    code: raw.roleCode ?? raw.code,
    type: typeof raw.roleType === 'number' ? raw.roleType : raw.isSystem ? ROLE_TYPES.system : ROLE_TYPES.custom,
    description: raw.description ?? raw.desc ?? '',
    memberCount: raw.memberCount ?? raw.userCount ?? raw.members ?? 0,
    permissionCount: raw.permissionCount ?? raw.permissions?.length ?? raw.permissionCodes?.length ?? 0,
    raw,
  }
}

const loadRoleList = async () => {
  loading.value = true
  try {
    const res = await sysApi.role.getRoleList({ filter: searchKeyword.value || null })
    const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
    roleList.value = list.map(normalizeRole).filter(Boolean)
  } catch (error) {
    console.error('加载角色列表失败', error)
    ElMessage.error(error.message || '加载角色列表失败')
  } finally {
    loading.value = false
  }
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

const isSelected = (row) => selection.value.some((r) => r.id === row.id)

const toggleSelectRow = (row, event) => {
  const checked = event.target.checked
  const exists = selection.value.find((r) => r.id === row.id)
  if (checked && !exists) {
    selection.value = [...selection.value, row]
  } else if (!checked && exists) {
    selection.value = selection.value.filter((r) => r.id !== row.id)
  }
}

const toggleSelectAll = (event) => {
  if (event.target.checked) {
    selection.value = [...filteredRoles.value]
  } else {
    selection.value = []
  }
}

const prevPage = () => {
  if (pagination.page > 1) pagination.page -= 1
}

const nextPage = () => {
  if (pagination.page < totalPages.value) pagination.page += 1
}

const selectRole = (role) => {
  currentRole.value = role
}

const handleConfigPermission = async (role) => {
  if (!hasManagePermission()) {
    ElMessage.warning('您没有权限管理权限')
    return
  }
  currentRole.value = role
  permissionDrawerVisible.value = true
  
  // 获取当前用户的角色信息
  try {
    if (authStore.currentUser?.id) {
      const userDetail = await sysApi.user.getUserDetail(authStore.currentUser.id)
      // 从用户详情中提取角色ID列表，兼容不同的数据结构
      if (userDetail.roleIds && Array.isArray(userDetail.roleIds)) {
        currentUserRoleIds.value = userDetail.roleIds
      } else if (userDetail.roles && Array.isArray(userDetail.roles)) {
        currentUserRoleIds.value = userDetail.roles.map(r => r.id || r.roleId).filter(Boolean)
      } else {
        currentUserRoleIds.value = []
      }
    } else {
      currentUserRoleIds.value = []
    }
  } catch (error) {
    console.error('获取当前用户角色信息失败', error)
    currentUserRoleIds.value = []
  }
  
  await nextTick()
  if (!permissionModules.value.length) {
    await loadPermissionModules()
  }
  
  // 加载所有模块的权限树（但不更新 permissionTree.value），以便 selectedPermissionList 能显示所有权限
  for (const module of permissionModules.value) {
    if (!permissionCatalogStore.hasTree(module.code)) {
      await loadPermissionTree(module.code, false) // 不更新树，只加载到 store
    }
  }
  // 确保当前模块的权限树已加载并显示
  if (activeModule.value) {
    await loadPermissionTree(activeModule.value, true) // 更新树并设置选中状态
  }
  await fetchRolePermissions(role.id)
}

const fetchRolePermissions = async (roleId) => {
  try {
    const codes = await sysApi.role.getRolePermissions(roleId)
    const list = Array.isArray(codes) ? codes : []
    // 构建所有模块的权限映射，用于过滤系统权限
    const allModulesMap = new Map()
    const buildMap = (nodes) => {
      nodes.forEach((node) => {
        if (node.children?.length) {
          buildMap(node.children)
        } else if (node.code) {
          allModulesMap.set(node.code, node.grantType ?? GrantType.System)
        }
      })
    }
    // 遍历所有已加载的模块
    for (const module of permissionModules.value) {
      if (permissionCatalogStore.hasTree(module.code)) {
        const moduleTree = permissionCatalogStore.getTree(module.code)
        if (moduleTree) {
          const tree = buildTreeFromModule(moduleTree)
          buildMap(tree)
        }
      }
    }
    // 仅保留系统权限码
    const systemCodes = list.filter((code) =>
      isSystemPermission(allModulesMap.get(code))
    )
    originalPermissionCodes.value = systemCodes
    selectedCodes.value = [...systemCodes]
    await nextTick()
    // 设置当前模块的选中状态
    const currentModuleCodes = new Set()
    const collectCodes = (nodes) => {
      nodes.forEach((node) => {
        if (node.code) {
          currentModuleCodes.add(node.code)
        }
        if (node.children?.length) {
          collectCodes(node.children)
        }
      })
    }
    collectCodes(permissionTree.value)
    const currentModuleSelected = systemCodes.filter((code) =>
      currentModuleCodes.has(code)
    )
    permissionTreeRef.value?.setCheckedKeys(currentModuleSelected)
  } catch (error) {
    console.error('获取角色权限失败', error)
    ElMessage.error(error.message || '获取角色权限失败')
  }
}

const handleTreeCheck = () => {
  const codes = permissionTreeRef.value?.getCheckedKeys(true) || []
  // 获取当前模块的所有权限码
  const currentModuleCodes = new Set()
  const collectCodes = (nodes) => {
    nodes.forEach((node) => {
      if (node.code) {
        currentModuleCodes.add(node.code)
      }
      if (node.children?.length) {
        collectCodes(node.children)
      }
    })
  }
  collectCodes(permissionTree.value)
  // 过滤出当前模块的系统权限
  const currentModuleSelected = codes.filter((code) =>
    currentModuleCodes.has(code) && isSystemPermission(flatPermissionMap.value.get(code))
  )
  // 合并选中状态：移除当前模块的旧选中，添加新的选中
  selectedCodes.value = [
    ...selectedCodes.value.filter((code) => !currentModuleCodes.has(code)),
    ...currentModuleSelected,
  ]
}

const clearTreeSelection = () => {
  permissionTreeRef.value?.setCheckedKeys([])
  selectedCodes.value = []
}

const expandAll = () => {
  permissionTreeRef.value?.store?.nodesMap &&
    Object.values(permissionTreeRef.value.store.nodesMap).forEach((n) => {
      n.expanded = true
    })
}

const collapseAll = () => {
  permissionTreeRef.value?.store?.nodesMap &&
    Object.values(permissionTreeRef.value.store.nodesMap).forEach((n) => {
      n.expanded = false
    })
}

const filterTree = () => {
  // computed handles filtering; ensure selection sync
  nextTick(() => handleTreeCheck())
}

const removePermission = (code) => {
  const keys = new Set(selectedCodes.value)
  keys.delete(code)
  selectedCodes.value = Array.from(keys)
  permissionTreeRef.value?.setCheckedKeys(selectedCodes.value)
}

const handleSavePermissions = async () => {
  if (!currentRole.value) return
  permissionSaving.value = true
  try {
    // 仅提交 System 类型权限码
    const payload = selectedCodes.value.filter((code) =>
      isSystemPermission(flatPermissionMap.value.get(code))
    )
    await sysApi.role.saveRolePermissions(currentRole.value.id, payload)
    ElMessage.success('权限已保存')
    permissionDrawerVisible.value = false
    await loadRoleList()
  } catch (error) {
    console.error('保存角色权限失败', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    permissionSaving.value = false
  }
}

const handleDelete = async (role) => {
  if (!hasManagePermission()) {
    ElMessage.warning('您没有权限管理权限')
    return
  }
  if (role.type === ROLE_TYPES.system) {
    ElMessage.info('系统角色不可删除')
    return
  }
  confirmTitle.value = '确认删除'
  confirmMessage.value = `确定要删除角色 "${role.name}" 吗？此操作不可恢复。`
  confirmType.value = 'delete'
  confirmCallback.value = async () => {
  try {
    await sysApi.role.deleteRole(role.id)
    ElMessage.success('删除成功')
    await loadRoleList()
  } catch (error) {
      console.error('删除角色失败', error)
      ElMessage.error(error.message || '删除失败')
    }
  }
  confirmVisible.value = true
}

const handleBulkDelete = async () => {
  if (!selection.value.length) return
  const ids = selection.value.filter((r) => r.type !== ROLE_TYPES.system).map((r) => r.id)
  if (!ids.length) {
    ElMessage.info('系统角色不可批量删除')
    return
  }
  confirmTitle.value = '批量删除'
  confirmMessage.value = `确定删除选中的 ${ids.length} 个角色吗？`
  confirmType.value = 'delete'
  confirmCallback.value = async () => {
    try {
  await Promise.all(ids.map((id) => sysApi.role.deleteRole(id)))
  ElMessage.success('批量删除成功')
  await loadRoleList()
    } catch (error) {
      console.error('批量删除失败', error)
      ElMessage.error(error.message || '批量删除失败')
    }
  }
  confirmVisible.value = true
}

const handleBulkExport = () => {
  ElMessage.info('批量导出功能占位，待接入后端导出接口')
}

const handleExport = () => {
  ElMessage.info('导出功能占位，待接入后端导出接口')
}

const openCreate = () => {
  formMode.value = 'create'
  Object.assign(formModel, {
    id: null,
    name: '',
    code: '',
    type: ROLE_TYPES.custom,
    description: '',
  })
  formVisible.value = true
}

const openEdit = (role) => {
  formMode.value = 'edit'
  Object.assign(formModel, {
    id: role.id,
    name: role.name,
    code: role.code,
    type: role.type,
    description: role.description,
  })
  formVisible.value = true
}

const validateForm = () => {
  formErrors.name = ''
  formErrors.code = ''
  if (!formModel.name.trim()) {
    formErrors.name = '请输入角色名称'
  }
  if (!formModel.code.trim()) {
    formErrors.code = '请输入角色编码'
  } else {
    const exists = roleList.value.some((item) => item.code === formModel.code && item.id !== formModel.id)
    if (exists) formErrors.code = '角色编码已存在'
  }
  return !formErrors.name && !formErrors.code
}

const submitForm = async () => {
  if (!validateForm()) return
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      const created = await sysApi.role.createRole({
        roleName: formModel.name,
        roleCode: formModel.code,
        roleType: ROLE_TYPES.custom, // 新建角色固定为自定义类型
        description: formModel.description,
      })
      ElMessage.success('角色创建成功')
      formVisible.value = false
      await loadRoleList()
      if (created?.id) {
        const target = roleList.value.find((r) => r.id === created.id)
        if (target) selectRole(target)
      }
    } else {
      await sysApi.role.updateRole(formModel.id, {
        roleName: formModel.name,
        roleCode: formModel.code,
        roleType: formModel.type,
        description: formModel.description,
      })
      ElMessage.success('保存成功')
      formVisible.value = false
      await loadRoleList()
      const target = roleList.value.find((r) => r.id === formModel.id)
      if (target) selectRole(target)
    }
  } catch (error) {
    console.error('提交角色失败', error)
    ElMessage.error(error.message || '提交失败')
  } finally {
    formSubmitting.value = false
  }
}

const handleCopyRole = (role) => {
  openCreate()
  formModel.name = `${role.name}-副本`
  formModel.code = `${role.code || 'new_code'}_${Date.now().toString(36)}`
  formModel.type = ROLE_TYPES.custom // 复制角色时固定为自定义类型
  formModel.description = role.description
}

const buildTreeFromModule = (module) => {
  if (!module?.groups) return []
  const normalizeGroupToTree = (group) => {
    // 递归处理子分组
    const childGroups = Array.isArray(group.children) 
      ? group.children.map(normalizeGroupToTree).filter(Boolean)
      : []
    
    // 只保留系统级权限
    const systemPermissions = Array.isArray(group.permissions)
      ? group.permissions
          .filter((p) => isSystemPermission(p.grantType ?? GrantType.System))
          .map((p) => ({
            label: p.displayName || p.code,
            code: p.code,
            grantType: p.grantType ?? GrantType.System,
          }))
      : []
    
    // 合并子分组和系统权限
    const children = [...childGroups, ...systemPermissions].filter(Boolean)
    
    // 如果没有任何子节点，返回 null（不显示该分组）
    if (children.length === 0) {
      return null
    }
    
    return {
      label: group.displayName || group.code,
      code: group.code,
      grantType: GrantType.System,
      children,
    }
  }
  return module.groups
    .map(normalizeGroupToTree)
    .filter(Boolean) // 过滤掉空分组
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

const loadPermissionModules = async () => {
  try {
    await permissionCatalogStore.loadModules()
    if (!activeModule.value && permissionModules.value.length) {
      activeModule.value = permissionModules.value[0].code
    }
    if (activeModule.value && !permissionCatalogStore.hasTree(activeModule.value)) {
      await loadPermissionTree(activeModule.value, true) // 加载当前模块时更新树
    }
  } catch (error) {
    console.error('加载权限模块失败', error)
  }
}

const loadPermissionTree = async (moduleCode, updateTree = true) => {
  if (!moduleCode) return
  try {
    await permissionCatalogStore.loadModuleTree(moduleCode)
    const module = permissionCatalogStore.getTree(moduleCode)
    const tree = buildTreeFromModule(module)
    
    // 只有当前激活的模块才更新 permissionTree.value
    if (updateTree && activeModule.value === moduleCode) {
      permissionTree.value = tree
      // 只设置当前模块的权限到树中，不修改 selectedCodes（它保存所有模块的选中状态）
      await nextTick()
      // 获取当前模块的所有权限码
      const currentModuleCodes = new Set()
      const collectCodes = (nodes) => {
        nodes.forEach((node) => {
          if (node.code) {
            currentModuleCodes.add(node.code)
          }
          if (node.children?.length) {
            collectCodes(node.children)
          }
        })
      }
      collectCodes(permissionTree.value)
      // 只设置当前模块中已选中的权限
      const currentModuleSelected = selectedCodes.value.filter((code) =>
        currentModuleCodes.has(code) && isSystemPermission(flatPermissionMap.value.get(code))
      )
      permissionTreeRef.value?.setCheckedKeys(currentModuleSelected)
    }
  } catch (error) {
    console.error('加载权限树失败', error)
    ElMessage.error(error.message || '加载权限目录失败')
  }
}

const switchModule = async (code) => {
  if (activeModule.value === code) return
  activeModule.value = code
  await loadPermissionTree(code, true) // 切换模块时更新树
}

const filterPermissionNode = (value, data) => {
  if (!value) return true
  const kw = value.toLowerCase()
  return (data.label || '').toLowerCase().includes(kw) || (data.code || '').toLowerCase().includes(kw)
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
  await Promise.all([loadRoleList(), loadPermissionModules()])
})

onBeforeUnmount(() => {})
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

.role-page {
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

.btn.tab {
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 0.85rem;
}

.btn.tab.active {
  background: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
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
}

.filter-group .btn.tab {
  border-color: rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
}

.filter-group .btn.tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.filter-group .btn.tab.active {
  background: #fff;
  color: #0f172a;
  border-color: #fff;
}

.bulk-actions {
  display: flex;
  gap: 8px;
}

.bulk-actions .btn {
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  background: transparent;
}

.bulk-actions .btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.bulk-actions .btn.danger {
  color: #fca5a5;
  border-color: rgba(252, 165, 165, 0.4);
}

.left-pane, .right-pane {
  min-width: 0;
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
  grid-template-columns: 48px 1.5fr 1fr 0.7fr 0.7fr 1fr;
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

.table-body .tr {
  padding: 16px 28px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tr:hover {
  background: #f8fafc;
}

.tr.active {
  background: #f1f5f9;
  border-left: 3px solid var(--primary-color);
}

.tr:last-child {
  border-bottom: none;
}

.td {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 0.9rem;
}

.td.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checkbox {
  justify-content: center;
}

.checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color);
  cursor: pointer;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-block .name {
  font-weight: 600;
  color: var(--text);
}

.subline {
  margin-top: 4px;
}

.code-tag {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  background: #f1f5f9;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 3px 8px;
  font-family: "SF Mono", "Consolas", monospace;
}

.tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--border);
}

.tag-system {
  background: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
}

.tag-custom {
  background: #fff;
  color: var(--text);
  border-color: var(--border);
}

.muted {
  color: var(--text-secondary);
}

.actions {
  justify-content: flex-end;
  gap: 6px;
}

.link {
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.18s ease;
}

.link:hover:not(:disabled):not(.disabled) {
  background: #f1f5f9;
}

.link:disabled,
.link.disabled {
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.6;
}

.link.danger {
  color: var(--danger-color);
}

.link.danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.08);
}

.divider {
  color: #cbd5e1;
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

.select {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 14px;
  background: #fff;
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
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
  width: 900px;
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

.narrow-panel {
  width: 90vw;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: #0f172a;
  gap: 16px;
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

.drawer-header .tag {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}

.drawer-body {
  display: grid !important;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 16px;
  padding: 20px 28px;
  overflow: auto;
  flex: 1;
  background: #f8fafc;
  min-height: 0;
}

.drawer-left, .drawer-right {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: #fff;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.drawer-left {
  min-width: 0;
}

.drawer-right {
  min-width: 0;
}

.permission-hint {
  padding: 14px 16px;
  margin-bottom: 16px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 12px;
  color: #92400e;
  font-size: 0.9rem;
  line-height: 1.5;
}

.module-tabs {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
  padding: 0;
}

.module-tabs .btn.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  min-width: 80px;
  background: #f1f5f9 !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 999px !important;
  color: #64748b !important;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s ease;
  opacity: 1 !important;
  visibility: visible !important;
}

.module-tabs .btn.tab:hover {
  background: #e2e8f0 !important;
  color: #0f172a !important;
  border-color: #cbd5e1 !important;
}

.module-tabs .btn.tab.active {
  background: #0f172a !important;
  color: #fff !important;
  border-color: #0f172a !important;
}

.tree-node-label.disabled {
  color: #94a3b8;
}

.permission-tree.tree-disabled {
  pointer-events: none;
  opacity: 0.5;
}

.permission-tree.tree-disabled :deep(.el-checkbox) {
  cursor: not-allowed;
}

.tag-muted {
  margin-left: 6px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.drawer-toolbar {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.drawer-toolbar .input {
  flex: 1;
  min-width: 200px;
  height: 40px;
  border: 1px solid var(--border) !important;
  background: #fff !important;
  color: var(--text) !important;
  border-radius: 12px;
  padding: 0 14px;
}

.drawer-toolbar .input::placeholder {
  color: #94a3b8 !important;
}

.drawer-toolbar .input:focus {
  border-color: var(--text) !important;
  outline: none;
}

.toolbar-actions {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-actions .link {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  padding: 6px 12px;
  font-size: 13px;
}

.permission-tree {
  max-height: 480px;
  overflow: auto;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 14px;
}

.section-title {
  font-weight: 700;
  color: var(--text);
  font-size: 0.95rem;
}

.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selected-list {
  max-height: 480px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selected-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  transition: all 0.18s ease;
}

.selected-item:hover {
  background: #f1f5f9;
}

.selected-item .name {
  font-weight: 600;
  color: var(--text);
}

.selected-item .small {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.empty-hint {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.drawer-footer {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  border-top: 1px solid var(--border);
  background: #fff;
  flex-shrink: 0;
}

.diff {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.diff strong {
  color: var(--text);
}

.footer-actions {
  display: flex !important;
  flex-direction: row !important;
  gap: 10px;
}

.drawer-footer .btn.ghost {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
}

.drawer-footer .btn.ghost:hover {
  background: #1e293b;
  border-color: #1e293b;
  color: #fff;
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

.drawer-footer .btn.primary:disabled {
  opacity: 0.5;
}

/* 模态框 */
.modal {
  width: 520px;
  background: #fff;
  border-radius: 28px;
  border: 1px solid var(--border);
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
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

.modal-header .link {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.25rem;
}

.modal-header .link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.modal-footer {
  border-top: 1px solid var(--border);
  background: #fff;
  justify-content: flex-end;
  gap: 10px;
}

.modal-footer .btn.ghost {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
}

.modal-footer .btn.ghost:hover {
  background: #1e293b;
  border-color: #1e293b;
  color: #fff;
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

.modal-footer .btn.primary:disabled {
  opacity: 0.5;
}

.modal-footer .btn.danger {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}

.modal-footer .btn.danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.modal-body {
  padding: 24px;
  overflow: auto;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
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
  border: 1.5px solid #94a3b8;
  background: #fff;
  color: var(--text);
  border-radius: 12px;
  height: 44px;
}

.form-item .input:focus {
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.06);
}

.required {
  color: var(--danger-color);
}

.textarea {
  width: 100%;
  border: 1.5px solid #94a3b8;
  border-radius: 12px;
  padding: 14px 16px;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.18s ease;
}

.textarea:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.06);
}

.error {
  color: var(--danger-color);
  font-size: 0.8rem;
}

.small {
  font-size: 0.8rem;
}

/* 响应式 */
@media (max-width: 1280px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
  
  .detail-card {
    position: relative;
  }
}

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
  
  .table-head, .table-body .tr {
    padding-left: 20px;
    padding-right: 20px;
  }
  
  .drawer-body {
    grid-template-columns: 1fr;
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
    grid-template-columns: 48px 1fr 0.8fr;
  }
  
  .th:nth-child(3),
  .th:nth-child(4),
  .th:nth-child(5),
  .td:nth-child(3),
  .td:nth-child(4),
  .td:nth-child(5) {
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

