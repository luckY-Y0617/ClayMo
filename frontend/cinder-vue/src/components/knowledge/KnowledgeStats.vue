<template>
  <div class="stats-card">
    <div
      v-for="item in statItems"
      :key="item.key"
      class="stat-item"
    >
      <p class="label">{{ item.label }}</p>
      <p class="value">
        {{ item.value }}
      </p>
      <span class="hint">{{ item.hint }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({ docs: 0, words: 0, views: 0 }),
  },
  members: {
    type: Array,
    default: () => [],
  },
})

const statItems = computed(() => [
  {
    key: 'docs',
    label: '文档数',
    value: props.stats?.docs ?? 0,
    hint: '已发布 + 草稿',
  },
  {
    key: 'words',
    label: '累计字数',
    value: formatNumber(props.stats?.words ?? 0),
    hint: '自动估算',
  },
  {
    key: 'views',
    label: '浏览次数',
    value: formatNumber(props.stats?.views ?? 0),
    hint: '近 30 天',
  },
  {
    key: 'members',
    label: '成员',
    value: props.members?.length ?? 1,
    hint: '含所有协作者',
  },
])

function formatNumber(num) {
  if (num > 10000) {
    return `${(num / 10000).toFixed(1)}w`
  }
  return num.toLocaleString?.() ?? num
}
</script>

<style scoped>
.stats-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 8px 30px rgba(58, 47, 42, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.value {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-primary);
}

.hint {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>


