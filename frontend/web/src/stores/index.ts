import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export { useAuthStore } from './auth'
export { usePermissionStore } from './permission'
export { useTeamStore } from './team'
export { useKbWorkspaceStore } from './kbWorkspace'
export { useDocumentTreeStore } from './documentTree'

