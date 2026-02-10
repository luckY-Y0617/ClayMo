<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { EntityChangeDto } from '@/types'
import * as auditApi from '@/api/audit'

// State
const loading = ref(false)
const tableData = ref<EntityChangeDto[]>([])
const total = ref(0)

// Search params
const searchParams = reactive({
  startTime: '',
  endTime: '',
  entityTypeFullName: '',
  changeType: '',
  skipCount: 0,
  maxResultCount: 20,
})

// Detail drawer
const drawerVisible = ref(false)
const selectedChange = ref<EntityChangeDto | null>(null)

// Change types
const changeTypes = [
  { value: 'Created', label: '创建' },
  { value: 'Updated', label: '更新' },
  { value: 'Deleted', label: '删除' },
]

// Fetch data
const fetchData = async () => {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      skipCount: searchParams.skipCount,
      maxResultCount: searchParams.maxResultCount,
    }
    if (searchParams.startTime) params.startTime = searchParams.startTime
    if (searchParams.endTime) params.endTime = searchParams.endTime
    if (searchParams.entityTypeFullName) params.entityTypeFullName = searchParams.entityTypeFullName
    if (searchParams.changeType) params.changeType = searchParams.changeType

    const res = await auditApi.getEntityChangeList(params as any)
    tableData.value = res.items
    total.value = res.totalCount
  } catch (error) {
    console.error('获取实体变更失败:', error)
  } finally {
    loading.value = false
  }
}

// Search
const handleSearch = () => {
  searchParams.skipCount = 0
  fetchData()
}

// Reset
const handleReset = () => {
  Object.assign(searchParams, {
    startTime: '',
    endTime: '',
    entityTypeFullName: '',
    changeType: '',
    skipCount: 0,
  })
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

// View detail
const handleViewDetail = async (row: EntityChangeDto) => {
  try {
    selectedChange.value = await auditApi.getEntityChange(row.id)
    drawerVisible.value = true
  } catch (error) {
    console.error('获取变更详情失败:', error)
  }
}

// Get change type tag
const getChangeTypeTag = (type: string) => {
  switch (type) {
    case 'Created':
      return { text: '创建', type: 'success' }
    case 'Updated':
      return { text: '更新', type: 'warning' }
    case 'Deleted':
      return { text: '删除', type: 'danger' }
    default:
      return { text: type, type: 'info' }
  }
}

// Get entity name
const getEntityName = (fullName: string) => {
  const parts = fullName.split('.')
  return parts[parts.length - 1]
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="entity-changes-page">
    <div class="page-header">
      <h2 class="page-title">实体变更</h2>
    </div>

    <!-- Search -->
    <el-card class="search-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchParams.startTime"
            type="datetime"
            placeholder="开始时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 180px"
          />
          <span class="date-separator">至</span>
          <el-date-picker
            v-model="searchParams.endTime"
            type="datetime"
            placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="实体类型">
          <el-input
            v-model="searchParams.entityTypeFullName"
            placeholder="实体类型"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="变更类型">
          <el-select v-model="searchParams.changeType" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="t in changeTypes" :key="t.value" :value="t.value" :label="t.label" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="handleSearch">搜索</el-button>
          <el-button :icon="'Refresh'" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="changeTime" label="变更时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.changeTime).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="变更类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getChangeTypeTag(row.changeType).type as any" size="small">
              {{ getChangeTypeTag(row.changeType).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="entityTypeFullName" label="实体类型" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.entityTypeFullName" placement="top">
              <span class="entity-name">{{ getEntityName(row.entityTypeFullName) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="entityId" label="实体ID" min-width="200">
          <template #default="{ row }">
            <code class="entity-id">{{ row.entityId }}</code>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
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

    <!-- Detail Drawer -->
    <el-drawer v-model="drawerVisible" title="实体变更详情" size="600px">
      <div v-if="selectedChange" class="change-detail">
        <div class="detail-section">
          <h4 class="section-title">基本信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">变更时间</div>
              <div class="detail-value">{{ new Date(selectedChange.changeTime).toLocaleString('zh-CN') }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">变更类型</div>
              <div class="detail-value">
                <el-tag :type="getChangeTypeTag(selectedChange.changeType).type as any" size="small">
                  {{ getChangeTypeTag(selectedChange.changeType).text }}
                </el-tag>
              </div>
            </div>
          </div>
          <div class="detail-item full">
            <div class="detail-label">实体类型</div>
            <div class="detail-value code">{{ selectedChange.entityTypeFullName }}</div>
          </div>
          <div class="detail-item full">
            <div class="detail-label">实体ID</div>
            <div class="detail-value code">{{ selectedChange.entityId }}</div>
          </div>
        </div>

        <div v-if="selectedChange.propertyChanges?.length" class="detail-section">
          <h4 class="section-title">属性变更</h4>
          <div class="property-changes">
            <div
              v-for="(prop, index) in selectedChange.propertyChanges"
              :key="index"
              class="property-change-item"
            >
              <div class="property-name">{{ prop.propertyName }}</div>
              <div class="property-values">
                <div class="value-item old">
                  <span class="value-label">原值:</span>
                  <span class="value-content">{{ prop.originalValue || '(空)' }}</span>
                </div>
                <el-icon class="arrow-icon"><Right /></el-icon>
                <div class="value-item new">
                  <span class="value-label">新值:</span>
                  <span class="value-content">{{ prop.newValue || '(空)' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <el-empty v-else-if="selectedChange.changeType !== 'Created'" description="无属性变更详情" />
      </div>
    </el-drawer>
  </div>
</template>

<style lang="scss" scoped>
.entity-changes-page {
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

.date-separator {
  margin: 0 8px;
  color: $text-muted;
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

.entity-name {
  font-weight: 500;
  color: $primary-color;
}

.entity-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: $bg-tertiary;
  padding: 2px 8px;
  border-radius: 4px;
}

.change-detail {
  padding: 0 4px;
}

.detail-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid $border-color;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.detail-item {
  &.full {
    margin-bottom: 12px;
  }
}

.detail-label {
  font-size: 12px;
  color: $text-muted;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  color: $text-primary;

  &.code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    background: $bg-tertiary;
    padding: 8px 12px;
    border-radius: $radius-sm;
    word-break: break-all;
  }
}

.property-changes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.property-change-item {
  background: $bg-tertiary;
  border-radius: $radius-md;
  padding: 12px 16px;
}

.property-name {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 8px;
}

.property-values {
  display: flex;
  align-items: center;
  gap: 12px;
}

.value-item {
  flex: 1;
  padding: 8px 12px;
  border-radius: $radius-sm;
  font-size: 13px;

  &.old {
    background: rgba($danger-color, 0.1);
    border-left: 3px solid $danger-color;
  }

  &.new {
    background: rgba($success-color, 0.1);
    border-left: 3px solid $success-color;
  }
}

.value-label {
  font-size: 11px;
  color: $text-muted;
  display: block;
  margin-bottom: 2px;
}

.value-content {
  font-family: 'JetBrains Mono', monospace;
  color: $text-primary;
  word-break: break-all;
}

.arrow-icon {
  color: $text-muted;
  flex-shrink: 0;
}
</style>

