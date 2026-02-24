<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)

const goToLogin = () => {
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="register-page">
    <div class="register-card">
      <div class="register-header">
        <h1 class="register-title">注册</h1>
        <p class="register-subtitle">创建您的账号</p>
      </div>

      <el-empty description="注册页面开发中...">
        <el-button type="primary" @click="goToLogin">返回登录</el-button>
      </el-empty>

      <div class="register-footer">
        <span>已有账号?</span>
        <router-link to="/login" class="link">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 16px;
}

.register-card {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 12px;
  padding: 48px;
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

  &:hover {
    color: #1a1a1a;
  }
}
</style>

