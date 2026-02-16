<template>
  <div class="kb-workspace">
      <router-view />

    <CreateBaseModal
      v-model="createBaseVisible"
      :submitting="creatingBase"
      @submit="handleCreateBaseSubmit"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import CreateBaseModal from '@/components/knowledge/modals/CreateBaseModal.vue'
import { kbApi } from '@/api/kb.api'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useTeamStore } from '@/stores/team'

defineOptions({ name: 'KbWorkspaceLayout' })

const route = useRoute()
const router = useRouter()
const kbStore = useKnowledgeBaseStore()
const teamStore = useTeamStore()

const bases = ref([])
const currentBaseId = computed(() => route.params.baseId || '')

const createBaseVisible = ref(false)
const creatingBase = ref(false)

const isTeamMode = computed(() => !!teamStore.currentTeamId)
const currentTeamId = computed(() => teamStore.currentTeamId || '')

const ensureTeamLoaded = async () => {
  if (!teamStore.loaded) {
    try {
      await teamStore.loadMyTeams()
    } catch (error) {
      console.warn('加载团队上下文失败:', error)
    }
  }
}

const loadBases = async () => {
  await ensureTeamLoaded()
  try {
    const res = await kbApi.kb.list()
    const list = res?.items || res?.list || res || []
    bases.value = Array.isArray(list)
      ? list.filter((item) => {
          const isTeamBase = !!item.teamId
          if (!isTeamMode.value) return !isTeamBase
          return item.teamId === currentTeamId.value
        })
      : []
    kbStore.setBases(bases.value)
    // 如果路由没有 baseId，自动跳转第一个
    if (!currentBaseId.value && bases.value.length > 0) {
      router.replace({ name: 'kb-overview', params: { baseId: bases.value[0].id } })
    }
  } catch (error) {
    console.error('加载知识库列表失败:', error)
    bases.value = []
  }
}

const openCreateBaseModal = () => {
  createBaseVisible.value = true
}

const handleCreateBaseSubmit = async (payload) => {
  if (creatingBase.value) return
  try {
    creatingBase.value = true
    const isTeamCreate = isTeamMode.value || payload.createType === 'team'
    const targetTeamId = isTeamCreate ? (currentTeamId.value || payload.teamId) : ''
    const newBase = await kbApi.kb.create({
      name: payload.name.trim(),
      description: (payload.description || '').trim(),
      visibility: payload.visibility,
      icon: payload.icon || 'icon_default',
      allowMembersCreateDoc: !!payload.allowMembersCreateDoc,
      teamId: isTeamCreate ? targetTeamId : '',
    })
    bases.value = [newBase, ...(bases.value || [])]
    kbStore.setBases(bases.value)
    createBaseVisible.value = false
    ElMessage.success('知识库已创建')
    router.push({ name: 'kb-overview', params: { baseId: newBase.id } })
  } catch (error) {
    ElMessage.error(error?.message || '创建失败')
  } finally {
    creatingBase.value = false
  }
}

// 提供给子组件使用
provide('kbWorkspace', {
  bases,
  loadBases,
  openCreateBaseModal
})

watch(
  () => route.params.baseId,
  async () => {
    if (!bases.value.length) {
      await loadBases()
    }
  }
)

watch(
  () => teamStore.currentTeamId,
  async () => {
    await loadBases()
  }
)

onMounted(async () => {
  await loadBases()
})
</script>

<style scoped>
.kb-workspace {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>

