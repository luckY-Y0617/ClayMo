<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { AuditLogDto } from '@/types'
import * as auditApi from '@/api/audit'

// State
const loading = ref(false)
const tableData = ref<AuditLogDto[]>([])
const total = ref(0)

// Search params
const searchParams = reactive({
  startTime: '',
  endTime: '',
  httpMethod: '',
  url: '',
  userName: '',
  httpStatusCode: undefined as number | undefined,
  skipCount: 0,
  maxResultCount: 20,
})

// Detail drawer
const drawerVisible = ref(false)
const selectedLog = ref<AuditLogDto | null>(null)

// HTTP methods
const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

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
    if (searchParams.httpMethod) params.httpMethod = searchParams.httpMethod
    if (searchParams.url) params.url = searchParams.url
    if (searchParams.userName) params.userName = searchParams.userName
    if (searchParams.httpStatusCode) params.httpStatusCode = searchParams.httpStatusCode

    const res = await auditApi.getAuditLogList(params as any)
    tableData.value = res.items
    total.value = res.totalCount
  } catch (error) {
    console.error('获取审计日志失败:', error)
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
    httpMethod: '',
    url: '',
    userName: '',
    httpStatusCode: undefined,
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
const handleViewDetail = (row: AuditLogDto) => {
  selectedLog.value = row
  drawerVisible.value = true
}

// Get method tag type
const getMethodType = (method: string) => {
  switch (method) {
    case 'GET':
      return 'success'
    case 'POST':
      return 'primary'
    case 'PUT':
      return 'warning'
    case 'DELETE':
      return 'danger'
    case 'PATCH':
      return 'info'
    default:
      return 'info'
  }
}

// Get status tag type
const getStatusType = (status: number) => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 400 && status < 500) return 'warning'
  if (status >= 500) return 'danger'
  return 'info'
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="audit-logs-page">
    <div class="page-header">
      <h2 class="page-title">请求审计</h2>
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
        <el-form-item label="请求方法">
          <el-select v-model="searchParams.httpMethod" placeholder="全部" clearable style="width: 100px">
            <el-option v-for="m in httpMethods" :key="m" :value="m" :label="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="URL">
          <el-input v-model="searchParams.url" placeholder="请求路径" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="searchParams.userName" placeholder="用户名" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="状态码">
          <el-input-number
            v-model="searchParams.httpStatusCode"
            :min="100"
            :max="599"
            placeholder="状态码"
            controls-position="right"
            style="width: 100px"
          />
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
        <el-table-column prop="executionTime" label="时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.executionTime).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="方法" width="80">
          <template #default="{ row }">
            <el-tag :type="getMethodType(row.httpMethod) as any" size="small">{{ row.httpMethod }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="URL" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="url-text">{{ row.url }}</code>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.httpStatusCode) as any" size="small">{{ row.httpStatusCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="executionDuration" label="耗时" width="90">
          <template #default="{ row }">
            <span :class="{ 'slow-request': row.executionDuration > 1000 }"> {{ row.executionDuration }}ms </span>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="用户" width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="70" fixed="right">
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
    <el-drawer v-model="drawerVisible" title="审计日志详情" size="520px" class="audit-detail-drawer">
      <div v-if="selectedLog" class="log-detail">
        <div class="detail-section">
          <h4 class="section-title">基本信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">请求时间</div>
              <div class="detail-value">{{ new Date(selectedLog.executionTime).toLocaleString('zh-CN') }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">请求方法</div>
              <div class="detail-value">
                <el-tag :type="getMethodType(selectedLog.httpMethod) as any" size="small">{{
                  selectedLog.httpMethod
                }}</el-tag>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">状态码</div>
              <div class="detail-value">
                <el-tag :type="getStatusType(selectedLog.httpStatusCode) as any" size="small">{{
                  selectedLog.httpStatusCode
                }}</el-tag>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">执行耗时</div>
              <div class="detail-value">{{ selectedLog.executionDuration }}ms</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">请求信息</h4>
          <div class="detail-item full">
            <div class="detail-label">URL</div>
            <div class="detail-value code">{{ selectedLog.url }}</div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">用户信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">用户名</div>
              <div class="detail-value highlight">{{ selectedLog.userName || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">用户ID</div>
              <div class="detail-value code small">{{ selectedLog.userId || '-' }}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">客户端信息</h4>
          <div class="detail-item full">
            <div class="detail-label">IP 地址</div>
            <div class="detail-value highlight">{{ selectedLog.clientIpAddress || '-' }}</div>
          </div>
          <div class="detail-item full">
            <div class="detail-label">浏览器</div>
            <div class="detail-value browser-info">{{ selectedLog.browserInfo || '-' }}</div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style lang="scss" scoped>
.audit-logs-page {
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

.url-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.slow-request {
  color: $warning-color;
  font-weight: 500;
}

.log-detail {
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
  color: var(--el-text-color-primary);
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  &.full {
    margin-bottom: 12px;
  }
}

.detail-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}

.detail-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
  line-height: 1.5;

  &.highlight {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &.code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    background: var(--el-fill-color-light);
    padding: 10px 14px;
    border-radius: $radius-sm;
    word-break: break-all;
    border: 1px solid var(--el-border-color-lighter);
    color: var(--el-color-primary);

    &.small {
      font-size: 12px;
      padding: 8px 12px;
    }
  }

  &.browser-info {
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.6;
    word-break: break-word;
  }
}

// 优化 Drawer 样式
:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-drawer__title) {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

:deep(.el-drawer__body) {
  padding: 20px;
}
</style>

