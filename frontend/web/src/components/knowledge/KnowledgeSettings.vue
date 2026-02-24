<script setup lang="ts">
import { ref, watch } from 'vue'
import { KbUpdateInput, KbVisibility } from '@/api'
import { getIconEmoji, getIconKeyByEmoji } from '@/constants/kbIcons'

const props = defineProps<{
  settings: KbUpdateInput
  loading: boolean
  saving: boolean
  baseName: string
}>()

const emit = defineEmits<{
  (e: 'update:settings', value: KbUpdateInput): void
  (e: 'save'): void
}>()

const localSettings = ref<KbUpdateInput>({ ...props.settings })

watch(() => props.settings, (newVal) => {
  localSettings.value = { ...newVal }
}, { deep: true })

const updateSettings = (key: keyof KbUpdateInput, value: any) => {
  localSettings.value[key] = value
  emit('update:settings', localSettings.value)
}

const handleSave = () => {
  // 保存前将 emoji 转换为后端需要的 key
  const settingsToSave = {
    ...localSettings.value,
    icon: getIconKeyByEmoji(localSettings.value.icon),
  }
  emit('update:settings', settingsToSave)
  emit('save')
}
</script>

<template>
  <div class="kb-settings-content">
    <div class="kb-content-header">
      <h2 class="kb-content-title">知识库设置</h2>
      <p class="kb-content-subtitle">管理知识库的基本信息和权限</p>
    </div>

    <div v-loading="loading" class="kb-settings-list">
      <!-- 基本信息 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">📝</div>
          <div class="section-info">
            <h3>基本信息</h3>
            <p>知识库的名称、描述和图标</p>
          </div>
        </div>
        <div class="section-body">
          <div class="form-item-group">
            <label class="form-label required">名称</label>
            <el-input
              :model-value="localSettings.name"
              placeholder="知识库名称"
              maxlength="100"
              show-word-limit
              class="settings-input"
              @update:model-value="updateSettings('name', $event)"
            />
          </div>

          <div class="form-item-group">
            <label class="form-label">描述</label>
            <el-input
              :model-value="localSettings.description"
              type="textarea"
              placeholder="添加描述，让成员更好地了解这个知识库"
              :rows="3"
              maxlength="500"
              show-word-limit
              class="settings-input"
              @update:model-value="updateSettings('description', $event)"
            />
          </div>

          <div class="form-item-group">
            <label class="form-label">图标</label>
            <div class="icon-picker-inline">
              <div class="icon-preview-box">
                <span class="preview-icon">{{ getIconEmoji(localSettings.icon) }}</span>
              </div>
              <el-input
                :model-value="localSettings.icon"
                placeholder="输入 emoji"
                maxlength="10"
                class="icon-input"
                @update:model-value="updateSettings('icon', $event)"
              />
              <div class="icon-suggestions">
                <span
                  v-for="icon in ['📁', '📚', '💡', '🎯', '🚀', '📖', '🔬', '🎓']"
                  :key="icon"
                  class="suggestion-icon"
                  @click="updateSettings('icon', icon)"
                >
                  {{ icon }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 可见性 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">🔒</div>
          <div class="section-info">
            <h3>可见性</h3>
            <p>控制谁可以访问这个知识库</p>
          </div>
        </div>
        <div class="section-body">
          <div class="visibility-list">
            <div
              class="visibility-item"
              :class="{ active: localSettings.visibility === KbVisibility.Private }"
              @click="updateSettings('visibility', KbVisibility.Private)"
            >
              <div class="visibility-radio">
                <div v-if="localSettings.visibility === KbVisibility.Private" class="radio-dot"></div>
              </div>
              <div class="visibility-content">
                <span class="visibility-title">私密</span>
                <span class="visibility-desc">仅成员可访问</span>
              </div>
            </div>
            <div
              class="visibility-item"
              :class="{ active: localSettings.visibility === KbVisibility.Team }"
              @click="updateSettings('visibility', KbVisibility.Team)"
            >
              <div class="visibility-radio">
                <div v-if="localSettings.visibility === KbVisibility.Team" class="radio-dot"></div>
              </div>
              <div class="visibility-content">
                <span class="visibility-title">团队可见</span>
                <span class="visibility-desc">团队内成员可访问</span>
              </div>
            </div>
            <div
              class="visibility-item"
              :class="{ active: localSettings.visibility === KbVisibility.Public }"
              @click="updateSettings('visibility', KbVisibility.Public)"
            >
              <div class="visibility-radio">
                <div v-if="localSettings.visibility === KbVisibility.Public" class="radio-dot"></div>
              </div>
              <div class="visibility-content">
                <span class="visibility-title">公开</span>
                <span class="visibility-desc">所有人可访问</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成员权限 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">📄</div>
          <div class="section-info">
            <h3>成员权限</h3>
            <p>成员在知识库中的操作权限</p>
          </div>
        </div>
        <div class="section-body">
          <div class="permission-item">
            <div class="permission-info">
              <span class="permission-title">允许成员创建文档</span>
              <span class="permission-desc">成员可以创建新的文档</span>
            </div>
            <el-switch
              :model-value="localSettings.allowMembersCreateDoc"
              @update:model-value="updateSettings('allowMembersCreateDoc', $event)"
            />
          </div>
        </div>
      </div>

      <!-- 危险操作 -->
      <div class="settings-section danger-section">
        <div class="section-header">
          <div class="section-icon danger-icon">⚠️</div>
          <div class="section-info">
            <h3>危险操作</h3>
            <p>以下操作不可恢复，请谨慎操作</p>
          </div>
        </div>
        <div class="section-body">
          <div class="danger-item">
            <div class="danger-info">
              <span class="danger-title">删除知识库</span>
              <span class="danger-desc">删除后所有文档将无法恢复</span>
            </div>
            <el-button type="danger" plain size="small">删除知识库</el-button>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="settings-actions">
        <el-button
          type="primary"
          size="large"
          :loading="saving"
          :disabled="!localSettings.name?.trim()"
          @click="handleSave"
        >
          保存更改
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kb-settings-content {
  animation: fadeIn 0.2s ease;
}

.kb-content-header {
  margin-bottom: 24px;
}

.kb-content-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.kb-content-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 0;
}

.kb-settings-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 设置区块 */
.settings-section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.danger-section {
  border-color: #fecaca;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.danger-section .section-header {
  background: #fef2f2;
  border-bottom-color: #fecaca;
}

.section-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  flex-shrink: 0;
}

.danger-section .section-icon {
  background: #fecaca;
}

.danger-icon {
  color: #dc2626;
}

.section-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.danger-section .section-info h3 {
  color: #991b1b;
}

.section-info p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}

.danger-section .section-info p {
  color: #dc2626;
}

.section-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 表单项 */
.form-item-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.settings-input {
  width: 100%;
}

/* 图标选择器 */
.icon-picker-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.icon-preview-box {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 10px;
  flex-shrink: 0;
}

.preview-icon {
  font-size: 24px;
}

.icon-input {
  width: 120px;
}

.icon-suggestions {
  display: flex;
  gap: 6px;
}

.suggestion-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-icon:hover {
  background: #e2e8f0;
  transform: scale(1.1);
}

/* 可见性选项 */
.visibility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.visibility-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.visibility-item:hover {
  border-color: #cbd5e1;
}

.visibility-item.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.visibility-radio {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.visibility-item.active .visibility-radio {
  border-color: #3b82f6;
}

.radio-dot {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
}

.visibility-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.visibility-title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
}

.visibility-desc {
  font-size: 12px;
  color: #64748b;
}

/* 权限开关 */
.permission-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.permission-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.permission-title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
}

.permission-desc {
  font-size: 12px;
  color: #64748b;
}

/* 危险操作 */
.danger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
}

.danger-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.danger-title {
  font-size: 14px;
  font-weight: 500;
  color: #991b1b;
}

.danger-desc {
  font-size: 12px;
  color: #dc2626;
}

/* 保存按钮 */
.settings-actions {
  padding-top: 8px;
  display: flex;
  justify-content: flex-end;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
