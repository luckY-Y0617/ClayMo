<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { TenantGetListOutputDto, TenantProvisioningState } from '@/types'
import * as tenantApi from '@/api/tenant'
import { getDbTypeLabel } from '@/utils/database'

const router = useRouter()
const userStore = useUserStore()
const canManage = userStore.hasPermission('system.tenants.manage')

// Provisioning state labels and types
const getProvisioningStateLabel = (state: TenantProvisioningState): string => {
  const labels: Record<number, string> = {
    0: '未就绪',
    1: '初始化中',
    2: '就绪',
    3: '失败'
  }
  return labels[state] || '未知'
}

const getProvisioningStateType = (state: TenantProvisioningState): 'info' | 'warning' | 'success' | 'danger' => {
  const types: Record<number, 'info' | 'warning' | 'success' | 'danger'> = {
    0: 'info',
    1: 'warning',
    2: 'success',
    3: 'danger'
  }
  return types[state] || 'info'
}

// State
const loading = ref(false)
const tableData = ref<TenantGetListOutputDto[]>([])

// Search params
const searchParams = reactive({
  name: '',
  provisioningState: undefined as number | undefined,
  startTime: '',
  endTime: '',
})

// Fetch data
const fetchData = async () => {
  loading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (searchParams.name) params.name = searchParams.name
    if (searchParams.provisioningState !== undefined) params.provisioningState = searchParams.provisioningState
    if (searchParams.startTime) params.startTime = searchParams.startTime
    if (searchParams.endTime) params.endTime = searchParams.endTime

    tableData.value = await tenantApi.getTenantList(params as any)
  } catch (error) {
    // Axios 拦截器已统一处理错误显示
    console.error('获取租户列表失败:', error)
  } finally {
    loading.value = false
  }
}

// Search
const handleSearch = () => {
  fetchData()
}

// Reset search
const handleReset = () => {
  searchParams.name = ''
  searchParams.provisioningState = undefined
  searchParams.startTime = ''
  searchParams.endTime = ''
  fetchData()
}

// View detail
const handleView = (row: TenantGetListOutputDto) => {
  router.push(`/tenants/${row.id}`)
}

// Delete tenant
const handleDelete = async (row: TenantGetListOutputDto) => {
  try {
    await ElMessageBox.confirm(`确定要删除租户 "${row.name}" 吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await tenantApi.deleteTenant(row.id)
    ElMessage.success('租户删除成功')
    fetchData()
  } catch {
    // User cancelled or error
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="tenants-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">租户列表</h2>
      <el-button v-if="canManage" type="primary" :icon="'Plus'" @click="router.push('/tenants/create')">
        新建租户
      </el-button>
    </div>

    <!-- Search -->
    <el-card class="search-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="租户名称">
          <el-input v-model="searchParams.name" placeholder="请输入租户名称" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchParams.provisioningState" placeholder="全部" clearable style="width: 140px">
            <el-option label="未就绪" :value="0" />
            <el-option label="初始化中" :value="1" />
            <el-option label="就绪" :value="2" />
            <el-option label="失败" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="searchParams.startTime"
            type="date"
            placeholder="开始日期"
            value-format="YYYY-MM-DD"
            style="width: 150px"
          />
          <span class="date-separator">至</span>
          <el-date-picker
            v-model="searchParams.endTime"
            type="date"
            placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 150px"
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
        <el-table-column prop="name" label="租户名称" min-width="180">
          <template #default="{ row }">
            <el-link type="primary" @click="handleView(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="数据库类型" width="140">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ getDbTypeLabel(row.dbType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getProvisioningStateType(row.provisioningState)" size="small">
              {{ getProvisioningStateLabel(row.provisioningState) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creationTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ row.creationTime ? new Date(row.creationTime).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">详情</el-button>
            <el-button v-if="canManage" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.tenants-page {
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
</style>

