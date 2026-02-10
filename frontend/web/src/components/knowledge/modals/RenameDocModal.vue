<template>
  <BaseModal :model-value="modelValue" container-class="rename-doc-modal" @update:model-value="$emit('update:modelValue', $event)">
    <!-- 头部 -->
    <template #header>
      <h3 class="modal-title">重命名文档</h3>
      <button class="modal-close" @click="handleClose">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </template>

    <!-- 内容 -->
    <template #body>
      <form class="modal-form" @submit.prevent="handleSubmit">
        <!-- 当前标题 -->
        <div class="form-item">
          <label class="form-label">当前标题</label>
          <input
            :value="originalTitle"
            type="text"
            class="custom-input disabled"
            disabled
          />
        </div>

        <!-- 新标题 -->
        <div class="form-item">
          <label class="form-label required">新标题</label>
          <div class="input-wrapper">
            <input
              v-model="form.title"
              type="text"
              class="custom-input"
              :class="{ 'has-error': titleError }"
              placeholder="请输入新标题"
              maxlength="80"
              @blur="validateTitle"
              @input="titleError = ''"
            />
            <span class="input-count">{{ form.title.length }} / 80</span>
          </div>
          <p v-if="titleError" class="error-message">{{ titleError }}</p>
        </div>
      </form>
    </template>

    <!-- 底部 -->
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="submitting"
        @click="handleSubmit"
      >
        <span v-if="submitting" class="btn-loading">
          <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
              <animate attributeName="stroke-dashoffset" values="31.416;0;31.416" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </span>
        <span v-else>保存</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'

interface Props {
  modelValue?: boolean
  originalTitle?: string
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  originalTitle: '',
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'submit': [data: { title: string }]
}>()

const form = reactive({
  title: '',
})

const titleError = ref('')

const validateTitle = (): boolean => {
  if (!form.title.trim()) {
    titleError.value = '请输入标题'
    return false
  }
  titleError.value = ''
  return true
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.title = props.originalTitle
      titleError.value = ''
    }
  }
)

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  if (!validateTitle()) return
  emit('submit', { title: form.title })
}
</script>

<style scoped>
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>

