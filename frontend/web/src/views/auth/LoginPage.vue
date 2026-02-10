<script setup lang="ts">
/**
 * 登录页面
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { captchaApi } from '@/api'

// 固定租户ID（从环境变量读取）
const fixedTenantId = import.meta.env.VITE_FIXED_TENANT_ID || ''

interface FormState {
  email: string
  password: string
  verificationCode: string
  captchaId: string
}

interface FormErrors {
  email: string
  password: string
  verificationCode: string
}

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()

// 登出原因提示信息
const logoutReasonMessages: Record<string, string> = {
  expired: '登录已过期，请重新登录',
  idle: '您长时间未操作，已自动退出登录',
  max_session: '登录时长已超过限制，请重新登录',
  server_revoke: '您的会话已被服务器终止，请重新登录',
  account_disabled: '您的账号已被禁用',
  multi_tab_logout: '您已在其他标签页退出登录',
  manual: '您已退出登录',
}

const form = reactive<FormState>({
  email: '',
  password: '',
  verificationCode: '',
  captchaId: '',
})

const errors = reactive<FormErrors>({
  email: '',
  password: '',
  verificationCode: '',
})

const loading = ref(false)
const errorMessage = ref('')

const captchaImage = ref('')
const captchaLoading = ref(false)

const loginType = ref<'username' | 'email'>('username')

const clearError = (field: keyof FormErrors) => {
  errors[field] = ''
  errorMessage.value = ''
}

const requireField = (field: keyof FormState, message: string): boolean => {
  if (!form[field]) {
    ;(errors as Record<string, string>)[field] = message
    return false
  }
  ;(errors as Record<string, string>)[field] = ''
  return true
}

const switchLoginType = (type: 'username' | 'email') => {
  if (loginType.value === type) return
  loginType.value = type
  form.email = ''
  errors.email = ''
  errorMessage.value = ''
}

const validateEmail = (): boolean => {
  const ok = requireField(
    'email',
    loginType.value === 'username' ? '用户名不能为空' : '邮箱不能为空'
  )
  if (!ok) return false

  if (loginType.value === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      errors.email = '邮箱格式不正确'
      return false
    }
  }

  errors.email = ''
  return true
}

const validatePassword = () => requireField('password', '密码不能为空')
const validateVerificationCode = () => requireField('verificationCode', '验证码不能为空')

// 加载图形验证码
const loadCaptcha = async () => {
  captchaLoading.value = true
  try {
    const data = await captchaApi.getImageCaptcha()
    const id = (data as { id?: string })?.id || ''
    const imageBase64 = (data as { imageBase64?: string })?.imageBase64 || ''

    form.captchaId = id
    if (!imageBase64) {
      captchaImage.value = ''
      return
    }

    captchaImage.value = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`
  } catch (err) {
    errorMessage.value = (err as Error)?.message || '验证码加载失败'
    captchaImage.value = ''
    form.captchaId = ''
  } finally {
    captchaLoading.value = false
  }
}

const handleRefreshCaptcha = () => {
  if (captchaLoading.value) return
  loadCaptcha()
}

onMounted(async () => {
  await loadCaptcha()

  // 检查登出原因
  const reason = route.query.reason as string
  if (reason && logoutReasonMessages[reason]) {
    errorMessage.value = logoutReasonMessages[reason]
    router.replace({ name: 'Login' })
  }
})

const handleLogin = async () => {
  errorMessage.value = ''

  const ok = validateEmail() && validatePassword() && validateVerificationCode()

  if (!ok) return

  loading.value = true
  try {
    await authStore.login({
      userName: form.email,
      password: form.password,
      captchaId: form.captchaId,
      captchaCode: form.verificationCode,
      tenantId: fixedTenantId,
    })

    router.push('/')
  } catch (err) {
    errorMessage.value = (err as Error)?.message || '登录失败'
    loadCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">登录</h1>
        <p class="login-subtitle">使用您的账号登录系统</p>
      </div>

      <!-- 登录类型切换 -->
      <div class="login-type-switch">
        <button
          type="button"
          class="switch-button"
          :class="{ 'switch-button--active': loginType === 'username' }"
          @click="switchLoginType('username')"
        >
          用户名登录
        </button>
        <button
          type="button"
          class="switch-button"
          :class="{ 'switch-button--active': loginType === 'email' }"
          @click="switchLoginType('email')"
        >
          邮箱登录
        </button>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <!-- 用户名/邮箱 -->
        <div class="form-item">
          <label class="form-label">{{ loginType === 'username' ? '用户名' : '邮箱' }}</label>
          <div class="input-wrapper">
            <el-icon class="input-icon">
              <User v-if="loginType === 'username'" />
              <Message v-else />
            </el-icon>
            <input
              v-model="form.email"
              :type="loginType === 'email' ? 'email' : 'text'"
              class="form-input"
              :class="{ 'form-input--error': !!errors.email }"
              :placeholder="loginType === 'username' ? '请输入用户名' : '请输入邮箱地址'"
              @blur="validateEmail"
              @input="clearError('email')"
            />
          </div>
          <div v-if="errors.email" class="form-error">{{ errors.email }}</div>
        </div>

        <!-- 密码 -->
        <div class="form-item">
          <label class="form-label">密码</label>
          <div class="input-wrapper">
            <el-icon class="input-icon"><Lock /></el-icon>
            <input
              v-model="form.password"
              type="password"
              class="form-input"
              :class="{ 'form-input--error': !!errors.password }"
              placeholder="请输入密码"
              @blur="validatePassword"
              @input="clearError('password')"
              @keyup.enter="handleLogin"
            />
          </div>
          <div v-if="errors.password" class="form-error">{{ errors.password }}</div>
        </div>

        <!-- 验证码 -->
        <div class="form-item">
          <label class="form-label">验证码</label>
          <div class="verification-input-wrapper">
            <div class="input-wrapper">
              <el-icon class="input-icon"><Key /></el-icon>
              <input
                v-model="form.verificationCode"
                type="text"
                class="form-input verification-input"
                :class="{ 'form-input--error': !!errors.verificationCode }"
                placeholder="请输入验证码"
                @blur="validateVerificationCode"
                @input="clearError('verificationCode')"
              />
            </div>
            <div
              class="captcha-image-wrapper"
              :title="captchaLoading ? '加载中...' : '点击刷新验证码'"
              @click="handleRefreshCaptcha"
            >
              <img
                v-if="captchaImage"
                :src="captchaImage"
                alt="验证码"
                class="captcha-image"
                :class="{ 'captcha-image--loading': captchaLoading }"
              />
              <div v-else class="captcha-placeholder">
                <el-icon><Key /></el-icon>
              </div>
            </div>
          </div>
          <div v-if="errors.verificationCode" class="form-error">{{ errors.verificationCode }}</div>
        </div>

        <div v-if="errorMessage" class="form-error-message">{{ errorMessage }}</div>

        <el-button
          type="primary"
          native-type="submit"
          class="login-button"
          :loading="loading"
          :disabled="loading"
        >
          {{ loading ? '登录中...' : '登录' }}
        </el-button>
      </form>

      <div class="login-footer">
        <span>还没有账号?</span>
        <router-link to="/register" class="link">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 16px;
}

.login-card {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 12px;
  padding: 48px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.login-header {
  margin-bottom: 40px;
  text-align: center;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #333333;
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 14px;
  color: #999999;
  margin: 0;
}

.login-type-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 8px;
}

.switch-button {
  flex: 1;
  height: 40px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: #333333;
  }

  &--active {
    color: #333333;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

.form-item {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333333;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #999999;
  pointer-events: none;
  z-index: 1;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 0 12px 0 40px;
  font-size: 14px;
  color: #333333;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s ease;
  outline: none;

  &:focus {
    border-color: #333333;
    box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.1);
  }

  &--error {
    border-color: #f53f3f;

    &:focus {
      border-color: #f53f3f;
      box-shadow: 0 0 0 2px rgba(245, 63, 63, 0.1);
    }
  }

  &::placeholder {
    color: #999999;
  }
}

.verification-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.verification-input {
  flex: 1;
}

.captcha-image-wrapper {
  flex-shrink: 0;
  width: 120px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;

  &:hover {
    background: #eeeeee;
    border-color: #cccccc;
  }
}

.captcha-image {
  width: 100%;
  height: 100%;
  object-fit: contain;

  &--loading {
    opacity: 0.5;
  }
}

.captcha-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999999;
}

.form-hint {
  font-size: 12px;
  color: #666666;
  margin-top: 6px;
}

.form-error {
  font-size: 12px;
  color: #f53f3f;
  margin-top: 6px;
}

.form-error-message {
  font-size: 14px;
  color: #f53f3f;
  margin-bottom: 16px;
  text-align: center;
  padding: 8px;
  background: rgba(245, 63, 63, 0.08);
  border-radius: 6px;
}

.login-button {
  width: 100%;
  height: 44px;
  margin-top: 12px;
  font-size: 16px;
}

.login-footer {
  margin-top: 32px;
  text-align: center;
  font-size: 14px;
  color: #999999;
}

.link {
  color: #333333;
  text-decoration: none;
  margin-left: 4px;
  font-weight: 500;

  &:hover {
    color: #1a1a1a;
  }
}

@media (max-width: 768px) {
  .login-card {
    padding: 40px 32px;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
  }

  .login-title {
    font-size: 24px;
  }
}
</style>

