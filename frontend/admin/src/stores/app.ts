import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore(
  'app',
  () => {
    const sidebarCollapsed = ref(false)
    const isDark = ref(true) // Default to dark theme

    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    const toggleTheme = () => {
      isDark.value = !isDark.value
    }

    return {
      sidebarCollapsed,
      isDark,
      toggleSidebar,
      toggleTheme,
    }
  },
  {
    persist: true,
  }
)

