<template>
  <div class="editor-page">
    <KnowledgeEditor />
  </div>
</template>

<script setup>
import KnowledgeEditor from '@/components/knowledge/KnowledgeEditor.vue'

// 定义 props 以接收路由参数
defineProps({
  baseId: {
    type: String,
    default: ''
  },
  docId: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.editor-page {
  min-height: 100vh;
  background: #FFFFFF;
}
</style>


