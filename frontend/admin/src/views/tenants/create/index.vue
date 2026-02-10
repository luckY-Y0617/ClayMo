<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { TenantCreateAndBootstrapDto } from '@/types'
import * as tenantApi from '@/api/tenant'
import { DATABASE_TYPE_OPTIONS, getConnectionStringTemplate } from '@/utils/database'

const router = useRouter()

// State
const loading = ref(false)
const currentStep = ref(0)

const formRef = ref<FormInstance>()
const form = reactive<TenantCreateAndBootstrapDto>({
  name: '',
  dbType: 0, // 0 = MySQL
  defaultConnectionString: '',
  connectionStrings: [],
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入租户名称', trigger: 'blur' },
    { min: 2, max: 100, message: '租户名称长度在 2-100 个字符', trigger: 'blur' },
  ],
  dbType: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  defaultConnectionString: [{ required: true, message: '请输入数据库连接字符串', trigger: 'blur' }],
}

// Steps
const steps = [
  { title: '基本信息', description: '租户名称与数据库配置' },
  { title: '完成', description: '确认并创建' },
]

// Next step
const nextStep = async () => {
  if (currentStep.value === 0) {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
  }
  currentStep.value++
}

// Previous step
const prevStep = () => {
  currentStep.value--
}

// Submit
const handleSubmit = async () => {
  loading.value = true
  try {
    await tenantApi.createAndBootstrapTenant(form)
    ElMessage.success('租户创建成功，初始化任务已提交')
    router.push('/tenants/list')
  } catch (error: unknown) {
    // Axios 拦截器已统一处理错误显示
    console.error('创建租户失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-tenant-page">
    <div class="page-header">
      <el-button :icon="'ArrowLeft'" @click="router.back()">返回</el-button>
      <h2 class="page-title">创建租户</h2>
    </div>

    <el-card class="create-card">
      <!-- Steps -->
      <el-steps :active="currentStep" finish-status="success" class="create-steps">
        <el-step v-for="step in steps" :key="step.title" :title="step.title" :description="step.description" />
      </el-steps>

      <div class="step-content">
        <!-- Step 1: Basic Info -->
        <div v-show="currentStep === 0" class="step-form">
          <el-form ref="formRef" :model="form" :rules="rules" label-width="140px" label-position="right">
            <el-form-item label="租户名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入租户名称" maxlength="100" show-word-limit />
            </el-form-item>

            <el-form-item label="数据库类型" prop="dbType">
              <el-radio-group v-model="form.dbType" class="db-type-group">
                <el-radio v-for="db in DATABASE_TYPE_OPTIONS" :key="db.value" :value="db.value" class="db-type-radio">
                  <span class="db-icon">{{ db.icon }}</span>
                  <span class="db-label">{{ db.label }}</span>
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="连接字符串" prop="defaultConnectionString">
              <el-input
                v-model="form.defaultConnectionString"
                type="textarea"
                :rows="3"
                :placeholder="getConnectionStringTemplate(form.dbType)"
              />
              <div class="form-tip">
                <el-icon><InfoFilled /></el-icon>
                <span>模板：{{ getConnectionStringTemplate(form.dbType) }}</span>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 2: Confirm -->
        <div v-show="currentStep === 1" class="step-form">
          <div class="confirm-section">
            <h3 class="section-title">确认信息</h3>

            <div class="confirm-grid">
              <div class="confirm-item">
                <div class="confirm-label">租户名称</div>
                <div class="confirm-value">{{ form.name }}</div>
              </div>
              <div class="confirm-item">
                <div class="confirm-label">数据库类型</div>
                <div class="confirm-value">
                  <el-tag type="info" size="small">
                    {{ DATABASE_TYPE_OPTIONS.find((d) => d.value === form.dbType)?.label || '-' }}
                  </el-tag>
                </div>
              </div>
              <div class="confirm-item full-width">
                <div class="confirm-label">连接字符串</div>
                <div class="confirm-value code">{{ form.defaultConnectionString }}</div>
              </div>
            </div>

            <el-alert type="info" :closable="false" class="confirm-alert">
              <template #title>
                <span>创建租户后将自动提交初始化任务，您可以在租户详情页查看初始化状态。</span>
              </template>
            </el-alert>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="step-actions">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep < steps.length - 1" type="primary" @click="nextStep">下一步</el-button>
        <el-button v-if="currentStep === steps.length - 1" type="primary" :loading="loading" @click="handleSubmit">
          创建租户
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.create-tenant-page {
  max-width: 800px;
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

.create-card {
  :deep(.el-card__body) {
    padding: 32px;
  }
}

.create-steps {
  margin-bottom: 40px;
}

.step-content {
  min-height: 300px;
}

.step-form {
  max-width: 600px;
  margin: 0 auto;
}

.db-type-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
}

.db-type-radio {
  margin: 0;
  height: auto;
  
  :deep(.el-radio__input) {
    display: none;
  }

  :deep(.el-radio__label) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 20px;
    border: 2px solid rgba(71, 85, 105, 0.3);
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-fast;
    background: rgba(30, 41, 59, 0.3);
    width: 100%;
    
    &:hover {
      border-color: rgba(59, 130, 246, 0.5);
      background: rgba(59, 130, 246, 0.08);
    }
  }

  &.is-checked :deep(.el-radio__label) {
    border-color: $primary-color;
    background: rgba($primary-color, 0.15);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.db-icon {
  font-size: 24px;
  line-height: 1;
}

.db-label {
  font-size: 14px;
  font-weight: 500;
  color: #e2e8f0;
}

.form-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  background: rgba(59, 130, 246, 0.08);
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid rgba(59, 130, 246, 0.5);

  .el-icon {
    margin-top: 2px;
    color: #60a5fa;
  }
}

.confirm-section {
  padding: 20px 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
}

.confirm-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.confirm-item {
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.4);
  border-radius: $radius-md;
  border: 1px solid rgba(71, 85, 105, 0.3);

  &.full-width {
    grid-column: span 2;
  }
}

.confirm-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
  font-weight: 500;
}

.confirm-value {
  font-size: 14px;
  color: #e2e8f0;

  &.code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    word-break: break-all;
    color: #cbd5e1;
    background: rgba(15, 23, 42, 0.6);
    padding: 8px;
    border-radius: 4px;
    border: 1px solid rgba(71, 85, 105, 0.4);
  }
}

.confirm-alert {
  margin-top: 24px;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(71, 85, 105, 0.3);
}

// Element Plus 组件深色主题优化
:deep(.el-card) {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.3);
}

:deep(.el-steps) {
  .el-step__title {
    color: #cbd5e1;
    
    &.is-process {
      color: #f1f5f9;
    }
    
    &.is-finish {
      color: #60a5fa;
    }
  }
  
  .el-step__description {
    color: #94a3b8;
    
    &.is-process {
      color: #cbd5e1;
    }
  }
  
  .el-step__head {
    &.is-process {
      border-color: #3b82f6;
      color: #3b82f6;
    }
    
    &.is-finish {
      border-color: #60a5fa;
      color: #60a5fa;
    }
  }
  
  .el-step__line {
    background-color: rgba(71, 85, 105, 0.3);
  }
}

:deep(.el-form-item__label) {
  color: #e2e8f0;
  font-weight: 500;
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

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  color: #f1f5f9;
  
  &::placeholder {
    color: #64748b;
  }
}

:deep(.el-textarea__inner) {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.4);
  
  &:hover {
    border-color: rgba(59, 130, 246, 0.5);
  }
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

:deep(.el-input__count) {
  background: transparent;
  color: #94a3b8;
}
</style>

