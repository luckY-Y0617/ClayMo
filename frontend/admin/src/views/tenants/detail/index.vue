<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { TenantGetOutputDto, TenantBootstrapStateDto } from '@/types'
import * as tenantApi from '@/api/tenant'
import { getDbTypeLabel } from '@/utils/database'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const canManage = userStore.hasPermission('system.tenants.manage')

const tenantId = route.params.id as string

// State
const loading = ref(true)
const tenant = ref<TenantGetOutputDto | null>(null)
const bootstrapState = ref<TenantBootstrapStateDto | null>(null)
const pollingTimer = ref<number | null>(null)
const showConnectionString = ref(false) // 控制连接字符串显示/隐藏

// Retry dialog
const retryDialogVisible = ref(false)
const retryDialogLoading = ref(false)
const retryFormRef = ref<FormInstance>()
const retryForm = reactive({
  defaultConnectionString: '',
})

const retryRules: FormRules = {
  defaultConnectionString: [
    { required: true, message: '请输入数据库连接字符串', trigger: 'blur' },
  ],
}

// Fetch tenant
const fetchTenant = async () => {
  try {
    tenant.value = await tenantApi.getTenant(tenantId)
  } catch (error) {
    console.error('Failed to fetch tenant:', error)
    router.push('/tenants/list')
  } finally {
    loading.value = false
  }
}

// Fetch bootstrap state
const fetchBootstrapState = async () => {
  try {
    bootstrapState.value = await tenantApi.getTenantBootstrapState(tenantId)

    // 只在 Provisioning 时继续轮询，其他状态停止
    if (bootstrapState.value.state !== 'Provisioning') {
      stopPolling()
    }
  } catch {
    // Ignore errors during polling
  }
}

// Start polling for bootstrap state
const startPolling = () => {
  fetchBootstrapState()
  // 只在 Provisioning 状态时启动轮询
  if (!pollingTimer.value) {
    pollingTimer.value = window.setInterval(fetchBootstrapState, 3000)
  }
}

// Stop polling
const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

// Open retry dialog
const handleRetryBootstrap = () => {
  // 使用当前的连接字符串作为默认值
  retryForm.defaultConnectionString = tenant.value?.defaultConnectionString || ''
  retryDialogVisible.value = true
}

// Submit retry
const submitRetryBootstrap = async () => {
  const valid = await retryFormRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    await ElMessageBox.confirm(
      '确定要使用新的连接字符串重新初始化租户吗？此操作将重新创建数据库结构。',
      '确认重新初始化',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return // 用户取消
  }

  retryDialogLoading.value = true
  try {
    await tenantApi.bootstrapTenant(tenantId, {
      defaultConnectionString: retryForm.defaultConnectionString,
      ensureDatabaseCreated: true,
    })
    ElMessage.success('初始化任务已重新提交')
    retryDialogVisible.value = false
    
    // 开始轮询状态
    startPolling()
  } catch (error) {
    // 拦截器会显示错误
    console.error('重新初始化失败:', error)
  } finally {
    retryDialogLoading.value = false
  }
}

// Get state type
const getStateType = (state: string) => {
  switch (state) {
    case 'Ready':
      return 'success'
    case 'Failed':
      return 'danger'
    case 'Provisioning':
      return 'warning'
    case 'NotReady':
      return 'info'
    default:
      return 'info'
  }
}

// Get state text
const getStateText = (state: string) => {
  switch (state) {
    case 'Ready':
      return '已就绪'
    case 'Failed':
      return '失败'
    case 'Provisioning':
      return '初始化中'
    case 'NotReady':
      return '未就绪'
    default:
      return state
  }
}

// 隐藏连接字符串（显示为星号）
const maskConnectionString = (value: string) => {
  if (!value) return ''
  // 保留前 20 个字符，其余显示为星号
  if (value.length <= 20) {
    return '*'.repeat(value.length)
  }
  return value.substring(0, 20) + '*'.repeat(Math.min(value.length - 20, 30)) + '...'
}

// 切换连接字符串显示状态
const toggleConnectionStringVisibility = () => {
  showConnectionString.value = !showConnectionString.value
}

onMounted(() => {
  fetchTenant()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="tenant-detail-page">
    <div class="page-header">
      <el-button :icon="'ArrowLeft'" @click="router.back()">返回</el-button>
      <h2 class="page-title">租户详情</h2>
    </div>

    <el-skeleton :loading="loading" :rows="10" animated>
      <template #default>
        <div v-if="tenant" class="detail-content">
          <!-- Basic Info -->
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">基本信息</span>
                <el-tag :type="tenant.isActive ? 'success' : 'danger'" size="small">
                  {{ tenant.isActive ? '启用' : '停用' }}
                </el-tag>
              </div>
            </template>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">租户ID</div>
                <div class="info-value code">{{ tenant.id || '-' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">租户名称</div>
                <div class="info-value">{{ tenant.name || '-' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">数据库类型</div>
                <div class="info-value">
                  <el-tag type="info" size="small">{{ getDbTypeLabel(tenant.dbType) }}</el-tag>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">创建时间</div>
                <div class="info-value">
                  {{ tenant.creationTime ? new Date(tenant.creationTime).toLocaleString('zh-CN') : '-' }}
                </div>
              </div>
            </div>
          </el-card>

          <!-- Connection Strings -->
          <el-card v-if="tenant.connectionStrings && tenant.connectionStrings.length > 0" class="connection-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">连接字符串</span>
                <el-button
                  :icon="showConnectionString ? 'Hide' : 'View'"
                  size="small"
                  text
                  @click="toggleConnectionStringVisibility"
                >
                  {{ showConnectionString ? '隐藏' : '显示' }}
                </el-button>
              </div>
            </template>

            <div class="connection-list">
              <div
                v-for="(conn, index) in tenant.connectionStrings"
                :key="index"
                class="connection-item"
              >
                <div class="connection-name">
                  <el-icon><Link /></el-icon>
                  <span>{{ conn.name || `连接 ${index + 1}` }}</span>
                </div>
                <div class="connection-value">
                  <code class="connection-string">
                    {{ showConnectionString ? conn.value : maskConnectionString(conn.value) }}
                  </code>
                  <el-button
                    :icon="showConnectionString ? 'Hide' : 'View'"
                    size="small"
                    text
                    @click="toggleConnectionStringVisibility"
                  >
                    {{ showConnectionString ? '隐藏' : '显示' }}
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>

          <!-- Bootstrap State -->
          <el-card class="bootstrap-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">初始化状态</span>
                <div class="card-actions">
                  <el-button
                    v-if="canManage && bootstrapState?.state === 'Failed'"
                    type="primary"
                    size="small"
                    :icon="'Refresh'"
                    @click="handleRetryBootstrap"
                  >
                    重新初始化
                  </el-button>
                </div>
              </div>
            </template>

            <div v-if="bootstrapState" class="bootstrap-content">
              <div class="state-indicator">
                <div
                  class="state-icon"
                  :class="{
                    success: bootstrapState.state === 'Ready',
                    error: bootstrapState.state === 'Failed',
                    loading: bootstrapState.state === 'Provisioning',
                    pending: bootstrapState.state === 'NotReady',
                  }"
                >
                  <el-icon v-if="bootstrapState.state === 'Ready'" :size="32"><CircleCheckFilled /></el-icon>
                  <el-icon v-else-if="bootstrapState.state === 'Failed'" :size="32"><CircleCloseFilled /></el-icon>
                  <el-icon v-else-if="bootstrapState.state === 'Provisioning'" :size="32" class="is-loading"
                    ><Loading /></el-icon
                  >
                  <el-icon v-else :size="32"><Clock /></el-icon>
                </div>
                <div class="state-info">
                  <el-tag :type="getStateType(bootstrapState.state)" size="large">
                    {{ getStateText(bootstrapState.state) }}
                  </el-tag>
                  <div v-if="bootstrapState.provisionedAtUtc && bootstrapState.state === 'Ready'" class="state-time">
                    完成时间：{{ new Date(bootstrapState.provisionedAtUtc).toLocaleString('zh-CN') }}
                  </div>
                </div>
              </div>

              <!-- 失败时显示错误信息 -->
              <el-alert
                v-if="bootstrapState.state === 'Failed' && bootstrapState.lastError"
                type="error"
                :title="bootstrapState.lastError"
                :closable="false"
                class="error-alert"
              >
                <template #default>
                  <p>初始化失败，请检查数据库连接字符串是否正确。</p>
                  <p>您可以点击上方的"重新初始化"按钮，输入新的连接字符串重试。</p>
                </template>
              </el-alert>

              <!-- 初始化中的提示 -->
              <div v-if="bootstrapState.state === 'Provisioning'" class="progress-hint">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>正在初始化租户数据库，请稍候...</span>
              </div>

              <!-- 未就绪提示 -->
              <el-alert
                v-if="bootstrapState.state === 'NotReady'"
                type="info"
                :closable="false"
                class="info-alert"
              >
                <template #default>
                  <p>租户尚未初始化，无法使用。</p>
                  <p v-if="canManage">请联系管理员进行初始化操作。</p>
                </template>
              </el-alert>
            </div>

            <el-empty v-else description="暂无初始化状态信息" />
          </el-card>
        </div>
      </template>
    </el-skeleton>

    <!-- Retry Bootstrap Dialog -->
    <el-dialog
      v-model="retryDialogVisible"
      title="重新初始化租户"
      width="600px"
      destroy-on-close
    >
      <el-alert type="warning" :closable="false" style="margin-bottom: 20px">
        <template #title>
          <strong>注意事项</strong>
        </template>
        <template #default>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>重新初始化会使用新的连接字符串重新创建数据库结构</li>
            <li>请确保新的连接字符串正确且数据库可访问</li>
            <li>初始化过程可能需要几分钟，请耐心等待</li>
          </ul>
        </template>
      </el-alert>

      <el-form ref="retryFormRef" :model="retryForm" :rules="retryRules" label-width="120px">
        <el-form-item label="连接字符串" prop="defaultConnectionString">
          <el-input
            v-model="retryForm.defaultConnectionString"
            type="textarea"
            :rows="4"
            placeholder="请输入新的数据库连接字符串"
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            <span class="tip-text">示例：</span>
          </div>
          <div class="example-text">
            Server=localhost;Database=tenant_db;User=sa;Password=***;TrustServerCertificate=True
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="retryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="retryDialogLoading" @click="submitRetryBootstrap">
          确定重新初始化
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.tenant-detail-page {
  max-width: 900px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-out;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  &.full-width {
    grid-column: span 2;
  }
}

.info-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 500;

  &.code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    background: rgba(15, 23, 42, 0.6);
    padding: 10px 14px;
    border-radius: $radius-sm;
    word-break: break-all;
    border: 1px solid rgba(71, 85, 105, 0.4);
    color: #cbd5e1;
    font-weight: 400;
  }
}

.connection-card {
  margin-bottom: 20px;
}

.connection-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.connection-item {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(71, 85, 105, 0.4);
  border-radius: $radius-md;
  padding: 16px;
  transition: all $transition-fast;

  &:hover {
    border-color: rgba(59, 130, 246, 0.3);
    background: rgba(15, 23, 42, 0.6);
  }
}

.connection-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  .el-icon {
    color: #60a5fa;
    font-size: 16px;
  }
}

.connection-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-string {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: rgba(15, 23, 42, 0.8);
  padding: 12px 16px;
  border-radius: $radius-sm;
  word-break: break-all;
  border: 1px solid rgba(71, 85, 105, 0.5);
  color: #cbd5e1;
  line-height: 1.6;
  min-height: 46px;
  display: flex;
  align-items: center;
}

.bootstrap-content {
  text-align: center;
  padding: 20px 0;
}

.state-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.state-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 41, 59, 0.5);
  border: 3px solid rgba(71, 85, 105, 0.3);

  &.success {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.4);
    color: #22c55e;
  }

  &.error {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.4);
    color: #ef4444;
  }

  &.loading {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.4);
    color: #fbbf24;
  }

  &.pending {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
    color: #3b82f6;
  }
}

.state-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.state-time {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
}

.error-alert {
  margin-top: 20px;
  text-align: left;
  
  p {
    margin: 8px 0;
    line-height: 1.6;
  }
}

.info-alert {
  margin-top: 20px;
  text-align: left;
  
  p {
    margin: 8px 0;
    line-height: 1.6;
  }
}

.progress-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 14px;
  margin-top: 16px;
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  background: rgba(59, 130, 246, 0.08);
  padding: 8px 12px;
  border-radius: 6px 6px 0 0;
  border-left: 3px solid rgba(59, 130, 246, 0.5);
  border-bottom: none;

  .el-icon {
    color: #60a5fa;
  }
  
  .tip-text {
    font-weight: 500;
  }
}

.example-text {
  font-size: 12px;
  color: #94a3b8;
  background: rgba(59, 130, 246, 0.05);
  padding: 8px 12px;
  border-radius: 0 0 6px 6px;
  border-left: 3px solid rgba(59, 130, 246, 0.5);
  font-family: 'Courier New', monospace;
  word-break: break-all;
  white-space: pre-wrap;
  line-height: 1.6;
}

.is-loading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// Element Plus 组件深色主题优化
:deep(.el-card) {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.3);
}

:deep(.el-card__header) {
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
}

:deep(.el-tag) {
  font-weight: 500;
  
  &.el-tag--success {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.3);
    color: #22c55e;
  }
  
  &.el-tag--danger {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }
  
  &.el-tag--info {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    color: #60a5fa;
  }
  
  &.el-tag--warning {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
    color: #fbbf24;
  }
}

:deep(.el-skeleton) {
  .el-skeleton__item {
    background: rgba(30, 41, 59, 0.4);
  }
}
</style>

