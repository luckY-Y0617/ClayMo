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

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-item">
          <label class="form-label">租户</label>

          <div class="input-wrapper tenant-select" ref="tenantDropdownRef">
            <svg
              class="input-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9l9-7 9 7v10a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2V9z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <div
              class="tenant-select-display form-input"
              :class="{
                'form-input--error': !!errors.tenantId,
                'tenant-select--open': tenantDropdownOpen,
              }"
              role="button"
              tabindex="0"
              @click="toggleTenantDropdown"
              @keydown.enter.prevent="toggleTenantDropdown"
            >
              <span :class="{ 'placeholder-text': !selectedTenantLabel }">
                {{ selectedTenantLabel || '请选择租户' }}
              </span>
              <svg
                class="arrow-icon"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <div v-if="tenantDropdownOpen" class="tenant-options">
              <div
                class="tenant-option"
                :class="{ 'tenant-option--active': !form.tenantId }"
                @click="handleTenantSelect('')"
              >
                请选择租户
              </div>

              <div
                v-for="tenant in tenantOptions"
                :key="tenant.id"
                class="tenant-option"
                :class="{ 'tenant-option--selected': form.tenantId === tenant.id }"
                @click="handleTenantSelect(tenant.id)"
              >
                {{ tenant.name || tenant.displayName || tenant.id }}
              </div>

              <div v-if="tenantOptions.length === 0 && !tenantLoading" class="tenant-option tenant-option--empty">
                无可用租户
              </div>
              <div v-if="tenantLoading" class="tenant-option tenant-option--empty">
                正在加载...
              </div>
            </div>
          </div>

          <div v-if="tenantLoading" class="form-hint">租户列表加载中...</div>
          <div v-if="errors.tenantId" class="form-error">{{ errors.tenantId }}</div>
        </div>

        <div class="form-item">
          <label class="form-label">{{ loginType === 'username' ? '用户名' : '邮箱' }}</label>

          <div class="input-wrapper">
            <!-- 用户名图标 -->
            <svg
              v-if="loginType === 'username'"
              class="input-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <!-- 邮箱图标 -->
            <svg
              v-else
              class="input-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <polyline
                points="22,6 12,13 2,6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

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

        <div class="form-item">
          <label class="form-label">密码</label>

          <div class="input-wrapper">
            <svg
              class="input-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M7 11V7a5 5 0 0 1 10 0v4"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

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

        <div class="form-item">
          <label class="form-label">验证码</label>

          <div class="verification-input-wrapper">
            <div class="input-wrapper">
              <svg
                class="input-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

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
              @click="handleRefreshCaptcha"
              :title="captchaLoading ? '加载中...' : '点击刷新验证码'"
            >
              <img
                v-if="captchaImage"
                :src="captchaImage"
                alt="验证码"
                class="captcha-image"
                :class="{ 'captcha-image--loading': captchaLoading }"
              />
              <div v-else class="captcha-placeholder">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div v-if="errors.verificationCode" class="form-error">{{ errors.verificationCode }}</div>
        </div>

        <div v-if="errorMessage" class="form-error-message">{{ errorMessage }}</div>

        <button type="submit" class="login-button" :disabled="loading">
          <span v-if="loading" class="button-loading">
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25" />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            登录中...
          </span>
          <span v-else>登录</span>
        </button>
      </form>

      <div class="login-footer">
        <span>还没有账号?</span>
        <router-link to="/register" class="link">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeamStore } from '@/stores/team'
import { useTenantStore } from '@/stores/tenant'
import { sysApi } from '@/api/sys.api'
import { tenantApi } from '@/api/tenant.api'

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const teamStore = useTeamStore()
const tenantStore = useTenantStore()

// 登出原因提示信息映射
const logoutReasonMessages = {
  expired: '登录已过期，请重新登录',
  idle: '您长时间未操作，已自动退出登录',
  max_session: '登录时长已超过限制，请重新登录',
  server_revoke: '您的会话已被服务器终止，请重新登录',
  account_disabled: '您的账号已被禁用',
  multi_tab_logout: '您已在其他标签页退出登录',
  manual: '您已退出登录',
}

const form = reactive({
  email: '',
  password: '',
  verificationCode: '',
  captchaId: '', // 图形验证码ID
  tenantId: '',
})

const errors = reactive({
  email: '',
  password: '',
  verificationCode: '',
  tenantId: '',
})

const loading = ref(false)
const errorMessage = ref('')

const captchaImage = ref('')
const captchaLoading = ref(false)

const loginType = ref('username') // 'username' | 'email'

const tenantOptions = ref([])
const tenantLoading = ref(false)
const tenantDropdownOpen = ref(false)
const tenantDropdownRef = ref(null)

const tenantParams = reactive({
  name: '',
  isActive: true,
})

const selectedTenantLabel = computed(() => {
  const found = tenantOptions.value.find((t) => t.id === form.tenantId)
  return found?.name || ''
})

const getErrorMessage = (err, fallback) => {
  return err?.message || fallback
}

const clearError = (field) => {
  errors[field] = ''
  errorMessage.value = ''
}

const requireField = (field, message) => {
  if (!form[field]) {
    errors[field] = message
    return false
  }
  errors[field] = ''
  return true
}

// 切换登录类型
const switchLoginType = (type) => {
  if (loginType.value === type) return

  loginType.value = type
  form.email = ''
  errors.email = ''
  errorMessage.value = ''
}

const toggleTenantDropdown = () => {
  tenantDropdownOpen.value = !tenantDropdownOpen.value
}

const handleTenantSelect = (id) => {
  form.tenantId = id
  tenantStore.setTenant(id, false)
  tenantDropdownOpen.value = false
  clearError('tenantId')
}

const handleClickOutside = (event) => {
  const el = tenantDropdownRef.value
  if (el && !el.contains(event.target)) {
    tenantDropdownOpen.value = false
  }
}

const validateEmail = () => {
  const ok = requireField('email', loginType.value === 'username' ? '用户名不能为空' : '邮箱不能为空')
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
const validateTenant = () => requireField('tenantId', '请选择租户')

// 加载图形验证码
const loadCaptcha = async () => {
  captchaLoading.value = true
  try {
    const data = await sysApi.captcha.getImageCaptcha()
    const id = data?.id || ''
    const imageBase64 = data?.imageBase64 || ''

    form.captchaId = id
    if (!imageBase64) {
      captchaImage.value = ''
      return
    }

    captchaImage.value = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`
  } catch (err) {
    errorMessage.value = getErrorMessage(err, '验证码加载失败')
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

// 加载租户列表
const loadTenants = async () => {
  tenantLoading.value = true
  try {
    const res = await tenantApi.listTenants({
      name: tenantParams.name,
      isActive: tenantParams.isActive,
    })

    console.log(res)

    const items = res?.items ?? []
    tenantOptions.value = items.map((t) => ({
      id: t.id,
      name: t.name,
      displayName: t.displayName,
      isActive: t.isActive,
    }))

    // 若只有一个租户且未选择，默认选中
    if (!form.tenantId && tenantOptions.value.length === 1) {
      handleTenantSelect(tenantOptions.value[0].id)
      return
    }

    // 如果本地已有租户且仍在列表中，保持选中
    const storedId = tenantStore.tenantId
    if (storedId && tenantOptions.value.some((t) => t.id === storedId)) {
      form.tenantId = storedId
    }
  } finally {
    tenantLoading.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  // 并行加载：验证码 + 租户列表
  await Promise.all([loadCaptcha(), loadTenants()])

  // 检查是否有登出原因，显示相应提示
  const reason = route.query.reason
  if (reason && logoutReasonMessages[reason]) {
    errorMessage.value = logoutReasonMessages[reason]
    router.replace({ name: 'Login' }) // 清除 query 参数，避免刷新后仍显示
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleLogin = async () => {
  errorMessage.value = ''

  const ok =
    validateEmail() &&
    validatePassword() &&
    validateVerificationCode() &&
    validateTenant()

  if (!ok) return

  loading.value = true
  try {
    await authStore.login({
      loginType: loginType.value === 'username' ? 0 : 2, // 0=UserNamePassword, 2=EmailVerificationCode（按你现有约定）
      userName: form.email,
      password: form.password,
      captchaId: form.captchaId,
      captchaCode: form.verificationCode,
      tenantId: form.tenantId,
    })

    // 登录成功后初始化团队上下文，再进入主界面
    await teamStore.loadMyTeams()
    router.push('/')
  } catch (err) {
    errorMessage.value = getErrorMessage(err, '登录失败')
    loadCaptcha()
  } finally {
    loading.value = false
  }
}
</script>


<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  padding: var(--space-4, 16px);
}

.login-card {
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 48px 48px;
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
  background: #F5F5F5;
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
  position: relative;
}

.switch-button:hover {
  color: #333333;
}

.switch-button--active {
  color: #333333;
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-hint {
  font-size: 12px;
  color: #666666;
  margin-top: 6px;
}

.login-form {
  width: 100%;
}

.tenant-select {
  position: relative;
}

.tenant-select-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
}

.tenant-select--open {
  border-color: #333333;
  box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.1);
}

.tenant-options {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  z-index: 10;
  max-height: 220px;
  overflow-y: auto;
  padding: 6px;
}

.tenant-option {
  padding: 10px 12px;
  border-radius: 6px;
  color: #333333;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  background: #FFFFFF;
}

.tenant-option:hover {
  background: #F2F2F2;
}

.tenant-option--selected {
  background: #111111;
  color: #FFFFFF;
}

.tenant-option.tenant-option--selected:hover {
  background: #111111;
  color: #FFFFFF;
}

.tenant-option--active {
  font-weight: 500;
}

.tenant-option--empty {
  color: #999999;
  cursor: default;
}

.tenant-option--empty {
  pointer-events: none;
}



.placeholder-text {
  color: #999999;
}

.arrow-icon {
  margin-left: 8px;
  color: #999999;
  transition: transform 0.2s ease;
}

.tenant-select--open .arrow-icon {
  transform: rotate(180deg);
  color: #333333;
}

.form-item {
  margin-bottom: 28px;
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
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  transition: all 0.2s ease;
  outline: none;
}

.form-input:focus {
  border-color: #333333;
  box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.1);
}

.form-input--error {
  border-color: #F53F3F;
}

.form-input--error:focus {
  border-color: #F53F3F;
  box-shadow: 0 0 0 2px rgba(245, 63, 63, 0.1);
}

.form-input::placeholder {
  color: #999999;
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
  background: #F5F5F5;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.captcha-image-wrapper:hover {
  background: #EEEEEE;
  border-color: #CCCCCC;
}

.captcha-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.2s ease;
}

.captcha-image--loading {
  opacity: 0.5;
}

.captcha-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #999999;
}

.form-error {
  font-size: 12px;
  color: #F53F3F;
  margin-top: 6px;
}

.form-error-message {
  font-size: 14px;
  color: #F53F3F;
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
  font-weight: 500;
  color: #FFFFFF;
  background: #333333;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-button:hover:not(:disabled) {
  background: #1a1a1a;
}

.login-button:active:not(:disabled) {
  transform: scale(0.98);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
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
  transition: color 0.2s ease;
}

.link:hover {
  color: #1a1a1a;
}

/* 响应式设计 */
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
