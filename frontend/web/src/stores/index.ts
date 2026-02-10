/**
 * Pinia Store 统一导出
 */
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 导出所有 stores
export { useAuthStore } from './auth'
export { usePermissionStore } from './permission'
export { useTeamStore } from './team'
export { useKbWorkspaceStore } from './kbWorkspace'
export { useDocumentTreeStore } from './documentTree'

