<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { FormInstance, FormRules } from 'element-plus'
import { OfficeBuilding, HomeFilled } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

// 固定租户ID（从环境变量读取）
const fixedTenantId = import.meta.env.VITE_FIXED_TENANT_ID || ''

// 是否配置了租户（有配置则显示模式选择）
const hasTenantConfig = computed(() => !!fixedTenantId)

// 登录模式：'host' | 'tenant'
const loginMode = ref<'host' | 'tenant'>(fixedTenantId ? 'tenant' : 'host')

// 获取当前模式的租户ID
const currentTenantId = computed(() => (loginMode.value === 'host' ? '' : fixedTenantId))

const loginForm = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' },
  ],
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(loginForm.username, loginForm.password, currentTenantId.value)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (error: unknown) {
    console.error('登录失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <!-- Animated background -->
    <div class="bg-animation">
      <div class="stars"></div>
      <div class="stars2"></div>
      <div class="stars3"></div>
    </div>

    <div class="login-wrapper">
      <!-- Logo & Title -->
      <div class="login-header">
        <div class="logo-wrapper">
          <div class="logo">
            <svg viewBox="0 0 100 100" class="logo-svg">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color: #60a5fa" />
                  <stop offset="100%" style="stop-color: #3b82f6" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGradient)" stroke-width="4" />
              <path
                d="M35 50 L45 60 L65 40"
                fill="none"
                stroke="url(#logoGradient)"
                stroke-width="5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
        <h1 class="title">Cinder Admin</h1>
        <p class="subtitle">企业级后台管理系统</p>
      </div>

      <!-- Login Form -->
      <div class="login-card">
        <!-- Mode Selector (only show when tenant is configured) -->
        <div v-if="hasTenantConfig" class="mode-selector">
          <div
            class="mode-option"
            :class="{ active: loginMode === 'host' }"
            @click="loginMode = 'host'"
          >
            <el-icon :size="20"><HomeFilled /></el-icon>
            <span class="mode-label">Host 模式</span>
            <span class="mode-desc">平台管理</span>
          </div>
          <div
            class="mode-option"
            :class="{ active: loginMode === 'tenant' }"
            @click="loginMode = 'tenant'"
          >
            <el-icon :size="20"><OfficeBuilding /></el-icon>
            <span class="mode-label">租户模式</span>
            <span class="mode-desc">租户管理</span>
          </div>
        </div>

        <!-- Current Mode Indicator -->
        <div class="mode-indicator">
          <el-tag
            :type="loginMode === 'host' ? 'warning' : 'primary'"
            effect="dark"
            size="small"
          >
            {{ loginMode === 'host' ? '🏠 Host 管理员' : '🏢 租户管理员' }}
          </el-tag>
        </div>

        <el-form ref="formRef" :model="loginForm" :rules="rules" class="login-form" @submit.prevent="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="用户名"
              size="large"
              :prefix-icon="'User'"
              autocomplete="username"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="密码"
              size="large"
              :prefix-icon="'Lock'"
              show-password
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="loading" size="large" class="login-btn" @click="handleLogin">
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          <span class="version">v1.0.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  position: relative;
  overflow: hidden;
}

// Animated stars background
.bg-animation {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

@function random-stars($n) {
  $shadows: '';
  @for $i from 0 to $n {
    $shadows: $shadows + random(2000) + 'px ' + random(2000) + 'px #fff';
    @if $i < $n - 1 {
      $shadows: $shadows + ', ';
    }
  }
  @return unquote($shadows);
}

.stars,
.stars2,
.stars3 {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 2px;
  background: transparent;
  border-radius: 50%;
}

.stars {
  box-shadow: 1500px 800px #fff, 300px 400px #fff, 800px 200px #fff, 1200px 600px #fff, 500px 900px #fff,
    1800px 300px #fff, 200px 1200px #fff, 1000px 1500px #fff, 600px 100px #fff, 1400px 1000px #fff,
    100px 600px #fff, 1600px 1200px #fff, 400px 1400px #fff, 900px 800px #fff, 1100px 400px #fff;
  animation: animStar 50s linear infinite;
}

.stars2 {
  width: 3px;
  height: 3px;
  box-shadow: 700px 500px rgba(255, 255, 255, 0.8), 1300px 900px rgba(255, 255, 255, 0.8),
    200px 1100px rgba(255, 255, 255, 0.8), 1700px 200px rgba(255, 255, 255, 0.8),
    400px 700px rgba(255, 255, 255, 0.8);
  animation: animStar 100s linear infinite;
}

.stars3 {
  width: 4px;
  height: 4px;
  box-shadow: 1000px 300px rgba(255, 255, 255, 0.6), 500px 1300px rgba(255, 255, 255, 0.6),
    1500px 700px rgba(255, 255, 255, 0.6);
  animation: animStar 150s linear infinite;
}

@keyframes animStar {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-2000px);
  }
}

.login-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 20px;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.logo {
  width: 80px;
  height: 80px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.8));
  }
}

.logo-svg {
  width: 100%;
  height: 100%;
}

.title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 8px;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.login-card {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

// Mode Selector
.mode-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.mode-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;

  .el-icon {
    color: #64748b;
    transition: color 0.3s ease;
  }

  .mode-label {
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
  }

  .mode-desc {
    font-size: 11px;
    color: #64748b;
  }

  &:hover {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(59, 130, 246, 0.1);
  }

  &.active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.15);

    .el-icon {
      color: #3b82f6;
    }

    .mode-label {
      color: #f1f5f9;
    }

    .mode-desc {
      color: #94a3b8;
    }
  }
}

.mode-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.login-form {
  :deep(.el-input__wrapper) {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: none;
    transition: all 0.3s ease;

    &:hover {
      border-color: rgba(59, 130, 246, 0.5);
    }

    &.is-focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
  }

  :deep(.el-input__inner) {
    color: #f1f5f9;

    &::placeholder {
      color: #64748b;
    }
  }

  :deep(.el-input__prefix) {
    color: #64748b;
  }

  :deep(.el-form-item) {
    margin-bottom: 24px;
  }

  :deep(.el-form-item__error) {
    padding-top: 4px;
  }
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.version {
  font-size: 12px;
  color: #64748b;
}
</style>

