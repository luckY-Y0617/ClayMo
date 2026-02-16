import { defineStore } from 'pinia'

/**
 * 权限 Store
 * 
 * 管理当前用户的权限状态
 */
export const usePermissionStore = defineStore('permission', {
  state: () => ({
    /**
     * 当前用户的所有权限码列表
     * @type {string[]}
     */
    permissionCodes: [],
    
    /**
     * 权限是否已加载
     * @type {boolean}
     */
    loaded: false,
  }),

  getters: {
    /**
     * 检查是否拥有某个权限
     * @param {string} code - 权限码
     * @returns {boolean}
     */
    has: (state) => (code) => {
      if (!code) return true // 空权限码视为通过
      return state.permissionCodes.includes(code)
    },

    /**
     * 检查是否拥有任意一个权限
     * @param {string[]} codes - 权限码数组
     * @returns {boolean}
     */
    hasAny: (state) => (codes) => {
      if (!codes || codes.length === 0) return true // 空数组视为通过
      return codes.some(code => state.permissionCodes.includes(code))
    },

    /**
     * 检查是否拥有所有权限
     * @param {string[]} codes - 权限码数组
     * @returns {boolean}
     */
    hasAll: (state) => (codes) => {
      if (!codes || codes.length === 0) return true // 空数组视为通过
      return codes.every(code => state.permissionCodes.includes(code))
    },

    /**
     * 通用权限检查方法（预留 ABAC 扩展）
     * @param {string} permissionCode - 权限码
     * @param {any} context - 可选的上下文对象（用于未来 ABAC 扩展）
     * @returns {boolean}
     */
    can: (state) => (permissionCode, context = null) => {
      // 当前实现：仅基于权限码列表判断
      // 未来可扩展：根据 context 进行更复杂的 ABAC 判断
      if (!permissionCode) return true
      
      // 基础权限检查
      const hasPermission = state.permissionCodes.includes(permissionCode)
      
      // TODO: 未来可在此处添加基于 context 的额外判断
      // 例如：检查资源所有者、资源属性等
      // if (context) {
      //   // ABAC 逻辑
      // }
      
      return hasPermission
    },
  },

  actions: {
    /**
     * 设置权限列表
     * 在登录成功或刷新权限时调用
     * @param {string[]} codes - 权限码数组
     */
    setPermissions(codes) {
      this.permissionCodes = Array.isArray(codes) ? [...codes] : []
      this.loaded = true
    },

    /**
     * 检查是否拥有某个权限（has 方法的别名，用于兼容）
     * @param {string} code - 权限码
     * @returns {boolean}
     */
    hasPermission(code) {
      return this.has(code)
    },

    /**
     * 重置权限（清空权限列表）
     * 在登出或会话失效时调用
     */
    reset() {
      this.permissionCodes = []
      this.loaded = false
    },

    /**
     * 添加权限（可选，用于动态添加权限的场景）
     * @param {string} code - 权限码
     */
    addPermission(code) {
      if (code && !this.permissionCodes.includes(code)) {
        this.permissionCodes.push(code)
      }
    },

    /**
     * 移除权限（可选，用于动态移除权限的场景）
     * @param {string} code - 权限码
     */
    removePermission(code) {
      const index = this.permissionCodes.indexOf(code)
      if (index > -1) {
        this.permissionCodes.splice(index, 1)
      }
    },
  },
})

