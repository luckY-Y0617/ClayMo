<template>
  <div class="role-permission-editor">
    <div class="editor-header">
      <h2 class="editor-title">配置角色权限</h2>
      <div class="editor-actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          保存
        </el-button>
      </div>
    </div>

    <div class="editor-toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索权限..."
        clearable
        style="width: 300px;"
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <div class="toolbar-actions">
        <el-button size="small" @click="handleSelectAll">全选当前模块</el-button>
        <el-button size="small" @click="handleClearAll">清空当前模块</el-button>
        <el-button size="small" @click="handleExpandAll">
          {{ allExpanded ? '收起全部' : '展开全部' }}
        </el-button>
      </div>
    </div>

    <div class="editor-content">
      <!-- 左侧模块列表 -->
      <div class="module-sidebar">
        <div
          v-for="module in catalogStore.modules"
          :key="module.code"
          :class="['module-item', { active: activeModule === module.code }]"
          @click="handleModuleChange(module.code)"
        >
          <span class="module-name">{{ module.name }}</span>
          <el-icon v-if="catalogStore.isLoading(module.code)" class="loading-icon">
            <Loading />
          </el-icon>
        </div>
      </div>

      <!-- 右侧权限分组列表 -->
      <div class="permission-tree-container">
        <div v-if="catalogStore.isLoading(activeModule)" class="loading-wrapper">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <div v-else-if="catalogStore.getError(activeModule)" class="error-wrapper">
          <el-alert
            :title="`加载失败: ${catalogStore.getError(activeModule)?.message || '未知错误'}`"
            type="error"
            :closable="false"
          />
        </div>
        <div v-else-if="filteredGroups.length === 0" class="empty-wrapper">
          <el-empty description="暂无权限数据" />
        </div>
        <div v-else class="tree-wrapper">
          <permission-tree-node
            v-for="(group, index) in filteredGroups"
            :key="`${group.code}-${index}`"
            :group="group"
            :selected-codes="selectedCodes"
            :expanded-nodes="expandedNodes"
            :search-keyword="searchKeyword"
            :depth="0"
            @toggle-permission="handleTogglePermission"
            @toggle-expand="handleToggleExpand"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Loading } from '@element-plus/icons-vue'
import { usePermissionCatalogStore } from '@/stores/permissionCatalog'
import { GrantType, isSystemPermission } from '@/constants/grantType'
import PermissionTreeNode from './PermissionTreeNode.vue'

const props = defineProps({
  /**
   * 角色 ID
   */
  roleId: {
    type: [String, Number],
    required: true,
  },
  /**
   * 获取角色权限的 API 函数
   * @param {string|number} roleId - 角色 ID
   * @returns {Promise<string[]>} 权限码数组
   */
  fetchRolePermissions: {
    type: Function,
    required: true,
  },
  /**
   * 保存角色权限的 API 函数
   * @param {string|number} roleId - 角色 ID
   * @param {string[]} permissionCodes - 权限码数组（只包含 System 权限）
   * @returns {Promise<void>}
   */
  saveRolePermissions: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['cancel', 'saved'])

const catalogStore = usePermissionCatalogStore()

// 当前激活的模块
const activeModule = ref('')
// 选中的权限码集合（只包含 System 权限的 code）
const selectedCodes = ref(new Set())
// 展开的分组 code 集合
const expandedNodes = ref(new Set())
// 搜索关键词
const searchKeyword = ref('')
// 是否全部展开
const allExpanded = ref(false)
// 保存中状态
const saving = ref(false)

// 当前模块的分组列表
const currentGroups = computed(() => {
  if (!activeModule.value) return []
  return catalogStore.getGroups(activeModule.value)
})

// 过滤后的分组列表（根据搜索关键词）
const filteredGroups = computed(() => {
  if (!searchKeyword.value.trim()) {
    return currentGroups.value
  }

  const keyword = searchKeyword.value.toLowerCase().trim()
  
  /**
   * 检查分组是否匹配搜索关键词
   * @param {any} group - 分组
   * @returns {boolean}
   */
  const groupMatches = (group) => {
    // 检查分组本身
    if (
      group.code?.toLowerCase().includes(keyword) ||
      group.displayName?.toLowerCase().includes(keyword) ||
      group.description?.toLowerCase().includes(keyword)
    ) {
      return true
    }
    
    // 检查分组下的权限项
    if (Array.isArray(group.permissions)) {
      return group.permissions.some(permission =>
        permission.code?.toLowerCase().includes(keyword) ||
        permission.displayName?.toLowerCase().includes(keyword) ||
        permission.description?.toLowerCase().includes(keyword)
      )
    }
    
    return false
  }

  return currentGroups.value.filter(groupMatches)
})

/**
 * 切换权限项选中状态
 * @param {string} permissionCode - 权限码
 * @param {boolean} checked - 是否选中
 */
function handleTogglePermission(permissionCode, checked) {
  if (checked) {
    selectedCodes.value.add(permissionCode)
  } else {
    selectedCodes.value.delete(permissionCode)
  }
}

/**
 * 切换分组展开状态
 * @param {string} groupCode - 分组 code
 */
function handleToggleExpand(groupCode) {
  if (expandedNodes.value.has(groupCode)) {
    expandedNodes.value.delete(groupCode)
  } else {
    expandedNodes.value.add(groupCode)
  }
}

/**
 * 切换模块
 * @param {string} moduleCode - 模块代码
 */
async function handleModuleChange(moduleCode) {
  if (moduleCode === activeModule.value) return
  
  activeModule.value = moduleCode
  expandedNodes.value.clear()
  allExpanded.value = false
  searchKeyword.value = '' // 切换模块时清空搜索关键词
  
  // 懒加载模块权限树
  try {
    await catalogStore.loadModuleTree(moduleCode)
  } catch (error) {
    console.error(`加载模块 ${moduleCode} 失败:`, error)
    ElMessage.error(`加载模块权限树失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 收集当前模块中所有 System 权限的 code
 * @returns {string[]}
 */
function collectCurrentModuleSystemPermissionCodes() {
  const codes = []
  currentGroups.value.forEach(group => {
    if (Array.isArray(group.permissions)) {
      group.permissions.forEach(permission => {
        if (isSystemPermission(permission.grantType)) {
          codes.push(permission.code)
        }
      })
    }
  })
  return codes
}

/**
 * 全选当前模块（只选择 System 权限）
 */
function handleSelectAll() {
  if (!activeModule.value) return
  
  const systemCodes = collectCurrentModuleSystemPermissionCodes()
  systemCodes.forEach(code => selectedCodes.value.add(code))
  
  ElMessage.success('已全选当前模块的系统权限')
}

/**
 * 清空当前模块（只清空 System 权限）
 */
function handleClearAll() {
  if (!activeModule.value) return
  
  const systemCodes = collectCurrentModuleSystemPermissionCodes()
  systemCodes.forEach(code => selectedCodes.value.delete(code))
  
  ElMessage.success('已清空当前模块')
}

/**
 * 展开/收起全部
 */
function handleExpandAll() {
  if (allExpanded.value) {
    // 收起全部
    expandedNodes.value.clear()
    allExpanded.value = false
  } else {
    // 展开全部：收集所有分组的 code
    currentGroups.value.forEach(group => {
      expandedNodes.value.add(group.code)
    })
    allExpanded.value = true
  }
}

/**
 * 搜索处理
 */
function handleSearch() {
  // 搜索时自动展开匹配的分组
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim()
    currentGroups.value.forEach(group => {
      const groupMatches = 
        group.code?.toLowerCase().includes(keyword) ||
        group.displayName?.toLowerCase().includes(keyword) ||
        group.description?.toLowerCase().includes(keyword)
      
      const permissionMatches = Array.isArray(group.permissions) &&
        group.permissions.some(permission =>
          permission.code?.toLowerCase().includes(keyword) ||
          permission.displayName?.toLowerCase().includes(keyword) ||
          permission.description?.toLowerCase().includes(keyword)
        )
      
      if (groupMatches || permissionMatches) {
        expandedNodes.value.add(group.code)
      }
    })
  }
}

/**
 * 收集所有已加载模块的 System 权限 code
 * @returns {Set<string>}
 */
function collectAllSystemPermissionCodes() {
  const allSystemCodes = new Set()
  
  // 遍历所有已加载的模块
  catalogStore.modules.forEach(module => {
    const moduleTree = catalogStore.getTree(module.code)
    if (moduleTree && Array.isArray(moduleTree.groups)) {
      moduleTree.groups.forEach(group => {
        if (Array.isArray(group.permissions)) {
          group.permissions.forEach(permission => {
            if (isSystemPermission(permission.grantType)) {
              allSystemCodes.add(permission.code)
            }
          })
        }
      })
    }
  })
  
  return allSystemCodes
}

/**
 * 保存权限（只保存 System 权限）
 */
async function handleSave() {
  try {
    saving.value = true
    
    // 收集所有已加载模块的 System 权限 code（用于验证）
    const allSystemCodes = collectAllSystemPermissionCodes()
    
    // 过滤：只保留 System 权限
    // 注意：selectedCodes 中理论上不应该有 Resource 权限（因为 UI 已经禁用），
    // 但为了安全起见，这里再次过滤
    const systemPermissionCodes = Array.from(selectedCodes.value).filter(code =>
      allSystemCodes.has(code)
    )
    
    await props.saveRolePermissions(props.roleId, systemPermissionCodes)
    
    ElMessage.success('权限保存成功')
    emit('saved', systemPermissionCodes)
  } catch (error) {
    console.error('保存权限失败:', error)
    ElMessage.error(`保存失败: ${error.message || '未知错误'}`)
  } finally {
    saving.value = false
  }
}

/**
 * 取消
 */
function handleCancel() {
  emit('cancel')
}

/**
 * 初始化
 */
async function init() {
  try {
    // 1. 加载模块列表
    await catalogStore.loadModules()
    
    // 2. 设置默认激活模块（优先 system，其次第一个模块）
    const modules = catalogStore.modules
    if (modules.length > 0) {
      const systemModule = modules.find(m => m.code === 'system')
      activeModule.value = systemModule ? systemModule.code : modules[0].code
      
      // 3. 加载默认模块的权限树
      await catalogStore.loadModuleTree(activeModule.value)
    }
    
    // 4. 加载角色权限（这是最终真值来源）
    const permissionCodes = await props.fetchRolePermissions(props.roleId)
    
    // 5. 设置选中的权限码
    // 注意：角色权限列表可能包含 Resource 权限（如果后端返回了），
    // 但前端 UI 不会显示这些权限的勾选状态（因为 UI 已禁用 Resource 权限），
    // 保存时也会过滤掉 Resource 权限，所以这里可以全部加入
    // 后续在 UI 渲染和保存时会自动过滤
    selectedCodes.value = new Set(permissionCodes || [])
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error(`初始化失败: ${error.message || '未知错误'}`)
  }
}

onMounted(() => {
  init()
})
</script>

<style scoped>
.role-permission-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.editor-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #f9f9f9;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.editor-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.module-sidebar {
  width: 200px;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  background: #fafafa;
}

.module-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.module-item:hover {
  background: #f0f0f0;
}

.module-item.active {
  background: #e6f4ff;
  color: #1890ff;
  font-weight: 500;
}

.module-name {
  flex: 1;
}

.loading-icon {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.permission-tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.loading-wrapper,
.error-wrapper,
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #999;
}

.loading-wrapper {
  gap: 12px;
}

.tree-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>

