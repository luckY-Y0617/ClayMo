/**
 * 团队 Store
 */
import { defineStore } from 'pinia'
import { TeamMemberRole } from '@/types'
import type { TeamInfo } from '@/types'

// 重新导出类型
export { TeamMemberRole }
export type { TeamInfo }

interface TeamContext {
  mode: 'personal' | 'team'
  teamId: string | null
}

interface TeamState {
  teams: TeamInfo[]
  teamContext: TeamContext
  loaded: boolean
}

export const useTeamStore = defineStore('team', {
  state: (): TeamState => ({
    teams: [],
    teamContext: {
      mode: 'personal',
      teamId: null,
    },
    loaded: false,
  }),

  getters: {
    isTeamMode: (state) => state.teamContext.mode === 'team',
    currentTeamId: (state) => state.teamContext.teamId,
    currentTeam: (state) => {
      if (state.teamContext.mode !== 'team' || !state.teamContext.teamId) return null
      return (
        state.teams.find(
          (t) => t.id === state.teamContext.teamId || t.teamId === state.teamContext.teamId
        ) || null
      )
    },
  },

  actions: {
    setTeams(teams: TeamInfo[]) {
      this.teams = teams
      this.loaded = true

      // 如果当前选中的团队不在列表中，切回个人空间
      if (this.teamContext.mode === 'team' && this.teamContext.teamId) {
        const exists = teams.find(
          (t) => t.id === this.teamContext.teamId || t.teamId === this.teamContext.teamId
        )
        if (!exists) {
          this.switchToPersonal()
        }
      }
    },

    switchToPersonal() {
      this.teamContext = {
        mode: 'personal',
        teamId: null,
      }
    },

    switchToTeam(teamId: string) {
      this.teamContext = {
        mode: 'team',
        teamId,
      }
    },

    reset() {
      this.teams = []
      this.teamContext = {
        mode: 'personal',
        teamId: null,
      }
      this.loaded = false
    },
  },

  persist: {
    key: 'team',
    storage: localStorage,
    paths: ['teamContext'],
  },
})
