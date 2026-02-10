<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { PermissionDefinitionTreeDto, PermissionModuleNode, PermissionGroupNode } from '@/types'
import * as permissionApi from '@/api/permission'

// State
const loading = ref(false)
const permissionTree = ref<PermissionDefinitionTreeDto | null>(null)
const selectedModule = ref<string | null>(null)
const searchKeyword = ref('')

// Computed
const currentModule = computed<PermissionModuleNode | null>(() => {
  if (!permissionTree.value || !selectedModule.value) return null
  return permissionTree.value.find((m) => m.code === selectedModule.value) || null
})

const filteredGroups = computed<PermissionGroupNode[]>(() => {
  if (!currentModule.value) return []
  if (!searchKeyword.value) return currentModule.value.groups

  const keyword = searchKeyword.value.toLowerCase()
  return currentModule.value.groups
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter(
        (p) =>
          p.displayName.toLowerCase().includes(keyword) ||
          p.code.toLowerCase().includes(keyword) ||
          (p.description && p.description.toLowerCase().includes(keyword))
      ),
    }))
    .filter((group) => group.permissions.length > 0)
})

const totalPermissions = computed(() => {
  if (!permissionTree.value) return 0
  return permissionTree.value.reduce((total, module) => {
    return total + module.groups.reduce((groupTotal, group) => groupTotal + group.permissions.length, 0)
  }, 0)
})

// Fetch permissions
const fetchPermissions = async () => {
  loading.value = true
  try {
    permissionTree.value = await permissionApi.getPermissionDefinitions()
    if (permissionTree.value && permissionTree.value.length > 0) {
      selectedModule.value = permissionTree.value[0].code
    }
  } catch (error) {
    console.error('获取权限定义失败:', error)
  } finally {
    loading.value = false
  }
}

// Select module
const handleSelectModule = (moduleCode: string) => {
  selectedModule.value = moduleCode
  searchKeyword.value = ''
}

onMounted(() => {
  fetchPermissions()
})
</script>

<template>
  <div class="permissions-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">权限目录</h2>
        <el-tag type="info" size="small">只读视图</el-tag>
      </div>
      <div class="header-stats">
        <span class="stat-item">
          <strong>{{ permissionTree?.length || 0 }}</strong> 个模块
        </span>
        <span class="stat-item">
          <strong>{{ totalPermissions }}</strong> 个权限
        </span>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- Module List -->
      <el-col :span="6">
        <el-card class="module-card">
          <template #header>
            <span class="card-title">权限模块</span>
          </template>
          <el-skeleton :loading="loading" :rows="10" animated>
            <template #default>
              <div v-if="permissionTree?.length" class="module-list">
                <div
                  v-for="mod in permissionTree"
                  :key="mod.code"
                  class="module-item"
                  :class="{ active: selectedModule === mod.code }"
                  @click="handleSelectModule(mod.code)"
                >
                  <div class="module-icon">
                    <el-icon><Folder /></el-icon>
                  </div>
                  <div class="module-info">
                    <div class="module-name">{{ mod.displayName }}</div>
                    <div class="module-code">{{ mod.code }}</div>
                  </div>
                  <div class="module-count">
                    <el-tag type="info" size="small" round>
                      {{ mod.groups.reduce((t, g) => t + g.permissions.length, 0) }}
                    </el-tag>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无权限模块" :image-size="80" />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>

      <!-- Permission Groups & Permissions -->
      <el-col :span="18">
        <el-card class="content-card">
          <template #header>
            <div class="card-header">
              <div class="header-info">
                <span class="card-title">{{ currentModule?.displayName || '权限详情' }}</span>
                <span v-if="currentModule" class="module-code-header">{{ currentModule.code }}</span>
              </div>
              <el-input
                v-if="currentModule"
                v-model="searchKeyword"
                placeholder="搜索权限..."
                :prefix-icon="'Search'"
                clearable
                style="width: 240px"
              />
            </div>
          </template>

          <el-skeleton :loading="loading" :rows="15" animated>
            <template #default>
              <div v-if="currentModule">
                <div v-if="currentModule.description" class="module-desc">
                  {{ currentModule.description }}
                </div>

                <el-collapse v-if="filteredGroups.length" accordion>
                  <el-collapse-item v-for="group in filteredGroups" :key="group.code" :name="group.code">
                    <template #title>
                      <div class="group-title">
                        <el-icon><FolderOpened /></el-icon>
                        <span class="group-name">{{ group.displayName }}</span>
                        <span class="group-code">{{ group.code }}</span>
                        <el-tag type="info" size="small" round class="group-count">
                          {{ group.permissions.length }}
                        </el-tag>
                      </div>
                    </template>
                    <div class="permission-list">
                      <div v-for="permission in group.permissions" :key="permission.code" class="permission-item">
                        <div class="permission-main">
                          <div class="permission-name">{{ permission.displayName }}</div>
                          <code class="permission-code">{{ permission.code }}</code>
                        </div>
                        <div v-if="permission.description" class="permission-desc">
                          {{ permission.description }}
                        </div>
                      </div>
                    </div>
                  </el-collapse-item>
                </el-collapse>

                <el-empty v-else-if="searchKeyword" description="没有匹配的权限" :image-size="60" />
                <el-empty v-else description="该模块暂无权限分组" :image-size="80" />
              </div>
              <el-empty v-else description="请选择一个模块查看详情" :image-size="100" />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.permissions-page {
  animation: fadeIn 0.3s ease-out;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  font-size: 14px;
  color: #cbd5e1;

  strong {
    color: $primary-color;
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
  }
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-code-header {
  font-size: 12px;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(15, 23, 42, 0.6);
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid rgba(71, 85, 105, 0.4);
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.module-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  border: 1px solid transparent;

  &:hover {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.2);
  }

  &.active {
    background: rgba($primary-color, 0.15);
    border-color: $primary-color;

    .module-icon {
      color: $primary-color;
    }

    .module-name {
      color: $primary-color;
      font-weight: 600;
    }
  }
}

.module-icon {
  font-size: 18px;
  color: #94a3b8;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-name {
  font-size: 14px;
  font-weight: 500;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-code {
  font-size: 11px;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-desc {
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.6);
  border-radius: $radius-md;
  margin-bottom: 20px;
  color: #cbd5e1;
  font-size: 14px;
  border-left: 3px solid $primary-color;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
  font-weight: 500;
  width: 100%;
}

.group-name {
  flex-shrink: 0;
  color: #e2e8f0;
}

.group-code {
  font-size: 12px;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
  flex: 1;
}

.group-count {
  flex-shrink: 0;
}

.permission-list {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-item {
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.5);
  border-radius: $radius-md;
  transition: all $transition-fast;
  border: 1px solid rgba(71, 85, 105, 0.3);

  &:hover {
    background: rgba(51, 65, 85, 0.6);
    border-color: rgba(59, 130, 246, 0.3);
  }
}

.permission-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.permission-name {
  font-size: 14px;
  font-weight: 500;
  color: #f1f5f9;
}

.permission-code {
  font-size: 12px;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(15, 23, 42, 0.8);
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid rgba(71, 85, 105, 0.4);
}

.permission-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 8px;
  padding-left: 4px;
  line-height: 1.5;
}

// Element Plus 组件样式覆盖
:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item) {
  margin-bottom: 8px;
}

:deep(.el-collapse-item__header) {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 8px;
  padding: 0 16px;
  color: #e2e8f0;
  font-weight: 500;
  transition: all 0.3s;
  
  &:hover {
    background: rgba(51, 65, 85, 0.5);
    border-color: rgba(59, 130, 246, 0.3);
  }
  
  &.is-active {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-color: rgba(59, 130, 246, 0.4);
    background: rgba(59, 130, 246, 0.1);
  }
}

:deep(.el-collapse-item__wrap) {
  background: transparent;
  border: none;
}

:deep(.el-collapse-item__content) {
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-top: none;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  padding-bottom: 16px;
  color: #cbd5e1;
}

:deep(.el-card) {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.3);
}

:deep(.el-card__header) {
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
  color: #f1f5f9;
}

:deep(.el-card__body) {
  color: #cbd5e1;
}

:deep(.el-tag.el-tag--info) {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

:deep(.el-input__wrapper) {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.4);
  box-shadow: none;
  
  &:hover {
    border-color: rgba(59, 130, 246, 0.5);
  }
  
  &.is-focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

:deep(.el-input__inner) {
  color: #f1f5f9;
  
  &::placeholder {
    color: #64748b;
  }
}
</style>

