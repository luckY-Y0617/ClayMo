<template>
  <div class="register-page">
    <div class="register-card">
      <div class="register-header">
        <h1 class="register-title">注册</h1>
        <p class="register-subtitle">创建您的新账号</p>
      </div>

      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-item">
          <label class="form-label">邮箱</label>
          <div class="input-wrapper">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
            <input v-model="form.email" type="email" class="form-input" :class="{ 'form-input--error': errors.email }"
              placeholder="请输入邮箱" @blur="validateEmail" @input="clearError('email')" />
          </div>
          <div v-if="errors.email" class="form-error">{{ errors.email }}</div>
        </div>

        <div class="form-item">
          <label class="form-label">验证码</label>
          <div class="verification-input-wrapper">
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <input v-model="form.verificationCode" type="text" class="form-input verification-input"
                :class="{ 'form-input--error': errors.verificationCode }" placeholder="请输入验证码" maxlength="6"
                @blur="validateVerificationCode" @input="clearError('verificationCode')" />
            </div>
            <button type="button" class="verification-button" :disabled="codeButtonDisabled || codeCountdown > 0"
              @click="handleSendCode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 4v6h6M23 20v-6h-6M20 1h-6v6h6V1zM4 23h6v-6H4v6z" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <div v-if="errors.verificationCode" class="form-error">{{ errors.verificationCode }}</div>
        </div>

        <div class="form-item">
          <label class="form-label">密码</label>
          <div class="input-wrapper">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="form-input"
              :class="{ 'form-input--error': errors.password }" placeholder="请输入密码（至少8位，包含字母和数字）"
              @blur="validatePassword" @input="clearError('password')" @keyup.enter="handleRegister" />
          </div>
          <div v-if="errors.password" class="form-error">{{ errors.password }}</div>
        </div>

        <div v-if="errorMessage" class="form-error-message">{{ errorMessage }}</div>

        <button type="submit" class="register-button" :disabled="loading">
          <span v-if="loading" class="button-loading">
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25" />
              <path fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            注册中...
          </span>
          <span v-else>注册</span>
        </button>
      </form>

      <div class="register-footer">
        <span>已有账号？</span>
        <router-link to="/login" class="link">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { sysApi } from '@/api/sys.api'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  verificationCode: '',
  password: '',
})

const errors = reactive({
  email: '',
  verificationCode: '',
  password: '',
})

const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const codeCountdown = ref(0)
const codeButtonDisabled = ref(false)

const validateEmail = () => {
  if (!form.email) {
    errors.email = '邮箱不能为空'
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.email)) {
    errors.email = '邮箱格式不正确'
    return false
  }
  errors.email = ''
  return true
}

const validateVerificationCode = () => {
  if (!form.verificationCode) {
    errors.verificationCode = '验证码不能为空'
    return false
  }
  if (form.verificationCode.length !== 6) {
    errors.verificationCode = '验证码为6位数字'
    return false
  }
  errors.verificationCode = ''
  return true
}

const validatePassword = () => {
  if (!form.password) {
    errors.password = '密码不能为空'
    return false
  }
  if (form.password.length < 8) {
    errors.password = '密码长度至少8位'
    return false
  }
  // 至少包含字母和数字
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
  if (!passwordRegex.test(form.password)) {
    errors.password = '密码需包含字母和数字'
    return false
  }
  errors.password = ''
  return true
}

const clearError = (field) => {
  errors[field] = ''
  errorMessage.value = ''
}

const handleSendCode = async () => {
  // 先验证邮箱
  if (!validateEmail()) {
    return
  }

  codeButtonDisabled.value = true

  try {
    await sysApi.auth.sendVerificationCode({ email: form.email })

    // 开始倒计时
    codeCountdown.value = 60
    const timer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) {
        clearInterval(timer)
        codeButtonDisabled.value = false
      }
    }, 1000)
  } catch (error) {
    errorMessage.value = error.message
    codeButtonDisabled.value = false
  }
}

const handleRegister = async () => {
  // 清除之前的错误
  errorMessage.value = ''

  // 验证表单
  const isEmailValid = validateEmail()
  const isVerificationCodeValid = validateVerificationCode()
  const isPasswordValid = validatePassword()

  if (!isEmailValid || !isVerificationCodeValid || !isPasswordValid) {
    return
  }

  loading.value = true

  try {
    await sysApi.auth.register({
      email: form.email,
      verificationCode: form.verificationCode,
      password: form.password,
    })

    try {
      await authStore.login({
        email: form.email,
        password: form.password,
      })
      router.push('/home')
    } catch (loginError) {
      // 如果自动登录失败，跳转到登录页
      router.push('/login')
    }
  } catch (error) {
    errorMessage.value =  error.message 
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  padding: var(--space-4, 16px);
}

.register-card {
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 48px 48px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.register-header {
  margin-bottom: 40px;
  text-align: center;
}

.register-title {
  font-size: 28px;
  font-weight: 600;
  color: #333333;
  margin: 0 0 8px 0;
}

.register-subtitle {
  font-size: 14px;
  color: #999999;
  margin: 0;
}

.register-form {
  width: 100%;
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

.verification-button {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #999999;
  padding: 0;
}

.verification-button:hover:not(:disabled) {
  background: #EEEEEE;
  border-color: #CCCCCC;
}

.verification-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.register-button {
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

.register-button:hover:not(:disabled) {
  background: #1a1a1a;
}

.register-button:active:not(:disabled) {
  transform: scale(0.98);
}

.register-button:disabled {
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

.register-footer {
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
  .register-card {
    padding: 40px 32px;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .register-card {
    padding: 32px 24px;
  }

  .register-title {
    font-size: 24px;
  }

  .verification-input-wrapper {
    flex-direction: column;
  }

  .verification-button {
    width: 100%;
  }
}
</style>
