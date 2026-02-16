import { defineStore } from 'pinia'
import { sysApi } from '@/api/sys.api'

/**
 * 权限目录 Store
 * 
 * 负责管理权限目录的元数据缓存，包括：
 * - 模块列表
 * - 各模块的权限树
 * 
 * 注意：此 store 与 permission store 职责分离：
 * - permission store: 管理当前登录用户的权限码集合，用于运行时权限判断
 * - permissionCatalog store: 管理系统中所有可配置的权限点元数据，用于权限配置界面
 */
export const usePermissionCatalogStore = defineStore('permissionCatalog', {
  state: () => ({
    /**
     * 模块列表
     * @type {Array<{code: string, name: string, order: number}>}
     */
    modules: [],

    /**
     * 模块列表是否已加载
     * @type {boolean}
     */
    loadedModules: false,

    /**
     * 各模块的权限结构缓存
     * key: moduleCode, value: ModuleDto（包含 groups 和 permissions）
     * @type {Record<string, Object>}
     */
    treeByModule: {},

    /**
     * 各模块的加载状态
     * key: moduleCode, value: boolean
     * @type {Record<string, boolean>}
     */
    loadingByModule: {},

    /**
     * 各模块的错误信息
     * key: moduleCode, value: Error | null
     * @type {Record<string, Error | null>}
     */
    errorByModule: {},

    /**
     * 各模块的进行中请求 Promise（用于并发去重）
     * key: moduleCode, value: Promise
     * @type {Record<string, Promise>}
     */
    inflightByModule: {},
  }),

  getters: {
    /**
     * 根据模块代码获取模块名称
     * @param {string} code - 模块代码
     * @returns {string | undefined}
     */
    getModuleName: (state) => (code) => {
      const module = state.modules.find(m => m.code === code)
      return module?.name
    },

    /**
     * 判断指定模块的权限树是否已加载
     * @param {string} code - 模块代码
     * @returns {boolean}
     */
    hasTree: (state) => (code) => {
      const module = state.treeByModule[code]
      return module && module.groups && Array.isArray(module.groups)
    },

    /**
     * 获取指定模块的权限结构
     * @param {string} code - 模块代码
     * @returns {Object|null} ModuleDto，如果未加载则返回 null
     */
    getTree: (state) => (code) => {
      return state.treeByModule[code] || null
    },

    /**
     * 获取指定模块的分组列表
     * @param {string} code - 模块代码
     * @returns {Array} GroupDto[]，如果未加载则返回空数组
     */
    getGroups: (state) => (code) => {
      const module = state.treeByModule[code]
      return module?.groups || []
    },

    /**
     * 判断指定模块是否正在加载
     * @param {string} code - 模块代码
     * @returns {boolean}
     */
    isLoading: (state) => (code) => {
      return state.loadingByModule[code] === true
    },

    /**
     * 获取指定模块的错误信息
     * @param {string} code - 模块代码
     * @returns {Error | null}
     */
    getError: (state) => (code) => {
      return state.errorByModule[code] || null
    },
  },

  actions: {
    /**
     * 加载模块列表
     * 如果已加载则直接返回，否则请求接口并按 order 排序
     */
    async loadModules() {
      if (this.loadedModules) {
        return
      }

      try {
        const modules = await sysApi.permissionCatalog.getPermissionModules()
        
        // 按 order 升序排序
        const sortedModules = modules.sort((a, b) => {
          const orderA = a.order ?? 999
          const orderB = b.order ?? 999
          return orderA - orderB
        })

        this.modules = sortedModules
        this.loadedModules = true
      } catch (error) {
        console.error('加载权限模块列表失败:', error)
        throw error
      }
    },

    /**
     * 加载指定模块的权限树
     * 支持并发去重：如果已有进行中的请求，则等待该请求完成
     * 
     * @param {string} moduleCode - 模块代码
     */
    async loadModuleTree(moduleCode) {
      if (!moduleCode) {
        throw new Error('moduleCode is required')
      }

      // 如果已加载，直接返回
      if (this.hasTree(moduleCode)) {
        return
      }

      // 如果已有进行中的请求，等待该请求完成
      if (this.inflightByModule[moduleCode]) {
        return await this.inflightByModule[moduleCode]
      }

      // 创建新的请求 Promise
      const requestPromise = (async () => {
        try {
          // 设置加载状态
          this.loadingByModule[moduleCode] = true
          this.errorByModule[moduleCode] = null

          // 发起请求
          const tree = await sysApi.permissionCatalog.getPermissionTree(moduleCode)

          // 缓存结果
          this.treeByModule[moduleCode] = tree
        } catch (error) {
          console.error(`加载模块 ${moduleCode} 的权限树失败:`, error)
          this.errorByModule[moduleCode] = error
          throw error
        } finally {
          // 清理进行中的请求标记
          delete this.inflightByModule[moduleCode]
          this.loadingByModule[moduleCode] = false
        }
      })()

      // 保存进行中的请求 Promise
      this.inflightByModule[moduleCode] = requestPromise

      return await requestPromise
    },

    /**
     * 清除指定模块的权限树缓存（用于强制刷新）
     * @param {string} moduleCode - 模块代码
     */
    clearModuleTree(moduleCode) {
      if (moduleCode) {
        delete this.treeByModule[moduleCode]
        delete this.loadingByModule[moduleCode]
        delete this.errorByModule[moduleCode]
        delete this.inflightByModule[moduleCode]
      }
    },

    /**
     * 重置所有状态（用于测试或重置场景）
     */
    reset() {
      this.modules = []
      this.loadedModules = false
      this.treeByModule = {}
      this.loadingByModule = {}
      this.errorByModule = {}
      this.inflightByModule = {}
    },
  },
})

