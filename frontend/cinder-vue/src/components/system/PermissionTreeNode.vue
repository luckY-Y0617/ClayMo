<template>
  <!-- 分组节点 -->
  <div v-if="isGroup" class="permission-group-node">
    <div
      :class="['group-item', { expanded: isExpanded }]"
      :style="{ paddingLeft: `${depth * 20 + 8}px` }"
    >
      <div class="group-header" @click="handleToggleExpand">
        <el-icon class="expand-icon">
          <ArrowDown v-if="isExpanded" />
          <ArrowRight v-else />
        </el-icon>
        <span class="group-label">{{ group.displayName }}</span>
        <span v-if="group.description" class="group-description">
          {{ group.description }}
        </span>
      </div>
      
      <!-- 分组复选框（用于全选/取消全选该分组下的 System 权限） -->
      <el-checkbox
        :model-value="isGroupChecked"
        :indeterminate="isGroupIndeterminate"
        @change="handleGroupCheckboxChange"
        class="group-checkbox"
        @click.stop
      >
        <span class="checkbox-label">全选</span>
      </el-checkbox>
    </div>

    <!-- 子分组（预留扩展） -->
    <div v-if="isExpanded && hasSubGroups" class="sub-groups">
      <permission-tree-node
        v-for="(subGroup, index) in group.children"
        :key="`${subGroup.code}-${index}`"
        :group="subGroup"
        :selected-codes="selectedCodes"
        :expanded-nodes="expandedNodes"
        :search-keyword="searchKeyword"
        :depth="depth + 1"
        @toggle-permission="$emit('toggle-permission', $event)"
        @toggle-expand="$emit('toggle-expand', $event)"
      />
    </div>

    <!-- 权限项列表 -->
    <div v-if="isExpanded" class="permissions-list">
      <permission-tree-node
        v-for="(permission, index) in group.permissions"
        :key="`${permission.code}-${index}`"
        :permission="permission"
        :selected-codes="selectedCodes"
        :expanded-nodes="expandedNodes"
        :search-keyword="searchKeyword"
        :depth="depth + 1"
        @toggle-permission="$emit('toggle-permission', $event)"
        @toggle-expand="$emit('toggle-expand', $event)"
      />
    </div>
  </div>

  <!-- 权限项节点 -->
  <div v-else class="permission-item-node">
    <div
      :class="['permission-item', { disabled: !isSelectable }]"
      :style="{ paddingLeft: `${depth * 20 + 8}px` }"
    >
      <el-checkbox
        :model-value="isChecked"
        :disabled="!isSelectable"
        @change="handlePermissionCheckboxChange"
        class="permission-checkbox"
      >
        <span class="permission-label">{{ permission.displayName }}</span>
        <span v-if="permission.description" class="permission-description">
          {{ permission.description }}
        </span>
        <span v-if="!isSelectable" class="permission-hint">
          （仅说明）
        </span>
      </el-checkbox>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import { GrantType, isSystemPermission } from '@/constants/grantType'

const props = defineProps({
  /**
   * 分组数据（当作为分组节点时）
   */
  group: {
    type: Object,
    default: null,
  },
  /**
   * 权限项数据（当作为权限项节点时）
   */
  permission: {
    type: Object,
    default: null,
  },
  /**
   * 选中的权限码集合
   */
  selectedCodes: {
    type: Set,
    required: true,
  },
  /**
   * 展开的节点 code 集合
   */
  expandedNodes: {
    type: Set,
    default: () => new Set(),
  },
  /**
   * 搜索关键词
   */
  searchKeyword: {
    type: String,
    default: '',
  },
  /**
   * 节点深度（用于缩进）
   */
  depth: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['toggle-permission', 'toggle-expand'])

// 判断是否为分组节点
const isGroup = computed(() => !!props.group)

// 判断是否为权限项节点
const isPermission = computed(() => !!props.permission)

// ========== 分组节点相关计算 ==========

// 是否有子分组
const hasSubGroups = computed(() => {
  return isGroup.value && 
    Array.isArray(props.group.children) && 
    props.group.children.length > 0
})

// 是否展开
const isExpanded = computed(() => {
  if (!isGroup.value) return false
  return props.expandedNodes.has(props.group.code)
})

// 获取分组下所有 System 权限的 code
const getSystemPermissionCodes = computed(() => {
  if (!isGroup.value || !Array.isArray(props.group.permissions)) {
    return []
  }
  
  return props.group.permissions
    .filter(p => isSystemPermission(p.grantType))
    .map(p => p.code)
})

// 分组是否全选（所有 System 权限都被选中）
const isGroupChecked = computed(() => {
  if (!isGroup.value) return false
  
  const systemCodes = getSystemPermissionCodes.value
  if (systemCodes.length === 0) return false
  
  return systemCodes.every(code => props.selectedCodes.has(code))
})

// 分组是否半选（部分 System 权限被选中）
const isGroupIndeterminate = computed(() => {
  if (!isGroup.value) return false
  
  const systemCodes = getSystemPermissionCodes.value
  if (systemCodes.length === 0) return false
  
  const selectedCount = systemCodes.filter(code => 
    props.selectedCodes.has(code)
  ).length
  
  return selectedCount > 0 && selectedCount < systemCodes.length
})

// ========== 权限项节点相关计算 ==========

// 是否可勾选（只有 System 权限可勾选）
const isSelectable = computed(() => {
  if (!isPermission.value) return false
  return isSystemPermission(props.permission.grantType)
})

// 是否选中
const isChecked = computed(() => {
  if (!isPermission.value) return false
  return props.selectedCodes.has(props.permission.code)
})

// ========== 事件处理 ==========

/**
 * 处理分组复选框变化
 * @param {boolean} checked - 是否选中
 */
function handleGroupCheckboxChange(checked) {
  if (!isGroup.value) return
  
  const systemCodes = getSystemPermissionCodes.value
  
  // 只对 System 权限进行操作
  systemCodes.forEach(code => {
    emit('toggle-permission', code, checked)
  })
}

/**
 * 处理权限项复选框变化
 * @param {boolean} checked - 是否选中
 */
function handlePermissionCheckboxChange(checked) {
  if (!isPermission.value || !isSelectable.value) return
  
  emit('toggle-permission', props.permission.code, checked)
}

/**
 * 处理展开/收起
 */
function handleToggleExpand() {
  if (!isGroup.value) return
  emit('toggle-expand', props.group.code)
}
</script>

<style scoped>
.permission-group-node,
.permission-item-node {
  user-select: none;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  min-height: 36px;
  transition: background-color 0.2s;
}

.group-item:hover {
  background: #f5f5f5;
  border-radius: 4px;
}

.group-header {
  flex: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
}

.expand-icon {
  margin-right: 8px;
  color: #666;
  transition: transform 0.2s;
}

.group-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-right: 8px;
}

.group-description {
  font-size: 12px;
  color: #999;
}

.group-checkbox {
  margin-left: 16px;
}

.checkbox-label {
  font-size: 12px;
  color: #666;
}

.sub-groups {
  margin-left: 0;
}

.permissions-list {
  margin-left: 0;
}

.permission-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  min-height: 32px;
  transition: background-color 0.2s;
}

.permission-item:hover:not(.disabled) {
  background: #f5f5f5;
  border-radius: 4px;
}

.permission-item.disabled {
  opacity: 0.6;
}

.permission-checkbox {
  flex: 1;
  display: flex;
  align-items: center;
}

.permission-label {
  font-size: 14px;
  color: #333;
  margin-right: 8px;
}

.permission-item.disabled .permission-label {
  color: #999;
}

.permission-description {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.permission-hint {
  font-size: 12px;
  color: #ccc;
  margin-left: 8px;
  font-style: italic;
}
</style>
