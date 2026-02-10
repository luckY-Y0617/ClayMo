<template>
  <div class="editor-page">
    <KnowledgeEditorContainer />
  </div>
</template>

<script setup lang="ts">
import KnowledgeEditorContainer from '@/components/knowledge/KnowledgeEditorContainer.vue'

defineOptions({ name: 'KnowledgeEditorPage' })

// 定义 props 以接收路由参数（由 router 传递）
defineProps<{
  baseId?: string
  docId?: string
}>()
</script>

<style scoped>
.editor-page {
  min-height: 100vh;
  background: #ffffff;
}
</style>
