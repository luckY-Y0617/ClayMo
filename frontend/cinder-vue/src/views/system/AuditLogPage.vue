<template>
  <div class="audit-log-page">
    <div class="page-header">
      <h1 class="page-title">审计日志</h1>
    </div>

    <div class="page-content">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>用户</th>
              <th>操作</th>
              <th>资源</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logList" :key="log.id">
              <td>{{ formatTime(log.creationTime) }}</td>
              <td>{{ log.userName || '-' }}</td>
              <td>{{ log.action || '-' }}</td>
              <td>{{ log.resource || '-' }}</td>
              <td>
                <span :class="['status-badge', log.success ? 'status-badge--success' : 'status-badge--error']">
                  {{ log.success ? '成功' : '失败' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const logList = ref([])

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  // TODO: 加载审计日志列表
  logList.value = []
})
</script>

<style scoped>
.audit-log-page {
  padding: 32px;
  background: #F5F5F5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333333;
  margin: 0;
}

.page-content {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #F5F5F5;
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  color: #333333;
  border-bottom: 1px solid #E0E0E0;
}

.data-table td {
  padding: 12px 16px;
  font-size: 14px;
  color: #666666;
  border-bottom: 1px solid #F0F0F0;
}

.data-table tbody tr:hover {
  background: #F9F9F9;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.status-badge--success {
  background: rgba(34, 197, 94, 0.1);
  color: #22C55E;
}

.status-badge--error {
  background: rgba(245, 63, 63, 0.1);
  color: #F53F3F;
}
</style>

