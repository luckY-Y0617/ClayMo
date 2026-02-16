/**
 * 使用 auth.* 前缀存储所有认证相关数据
 */

const AUTH_PREFIX = 'auth.'

/**
 * 认证相关的 localStorage keys
 */
export const AUTH_KEYS = {
  ACCESS_TOKEN: 'auth.access_token',
  REFRESH_TOKEN: 'auth.refresh_token',
  USER_INFO: 'auth.user_info',
  PERMISSIONS: 'auth.permissions',
  CURRENT_TENANT: 'auth.current_tenant',
  LOGIN_AT: 'auth.login_at',
  EXPIRE_AT: 'auth.expire_at',
}

/**
 * 清除所有认证相关的 localStorage
 */
export function clearAuthLocalStorage() {
  const keysToRemove = []
  
  // 遍历所有 localStorage keys，找出所有 auth.* 开头的
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(AUTH_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  
  // 删除所有认证相关的 keys（包括 auth.logout_at）
  keysToRemove.forEach(key => localStorage.removeItem(key))
  
  // 确保 auth.logout_at 也被删除（即使不在遍历时找到）
  localStorage.removeItem('auth.logout_at')
}

/**
 * 保存认证信息到 localStorage
 * @param {Object} authData - 认证数据
 * @param {string} authData.token - Access Token
 * @param {string} authData.refreshToken - Refresh Token
 * @param {number|null} authData.expireAt - Token 过期时间戳
 * @param {Object|null} authData.user - 用户信息
 * @param {number|null} authData.loginAt - 登录时间戳
 * @param {string[]} authData.permissions - 权限码列表
 */
export function saveAuthToLocalStorage(authData) {
  if (authData.token) {
    localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, authData.token)
  }
  
  if (authData.refreshToken) {
    localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, authData.refreshToken)
  }
  
  if (authData.expireAt) {
    localStorage.setItem(AUTH_KEYS.EXPIRE_AT, authData.expireAt.toString())
  }
  
  if (authData.user) {
    localStorage.setItem(AUTH_KEYS.USER_INFO, JSON.stringify(authData.user))
  }
  
  if (authData.loginAt) {
    localStorage.setItem(AUTH_KEYS.LOGIN_AT, authData.loginAt.toString())
  }
  
  if (authData.permissions && Array.isArray(authData.permissions)) {
    localStorage.setItem(AUTH_KEYS.PERMISSIONS, JSON.stringify(authData.permissions))
  }
}

/**
 * 从 localStorage 加载认证信息
 * @returns {Object} 认证数据
 */
export function loadAuthFromLocalStorage() {
  const token = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN) || ''
  const refreshToken = localStorage.getItem(AUTH_KEYS.REFRESH_TOKEN) || ''
  const expireAtStr = localStorage.getItem(AUTH_KEYS.EXPIRE_AT)
  const userStr = localStorage.getItem(AUTH_KEYS.USER_INFO)
  const loginAtStr = localStorage.getItem(AUTH_KEYS.LOGIN_AT)
  const permissionsStr = localStorage.getItem(AUTH_KEYS.PERMISSIONS)
  
  let expireAt = null
  if (expireAtStr) {
    const parsed = parseInt(expireAtStr, 10)
    if (!isNaN(parsed)) expireAt = parsed
  }
  
  let user = null
  if (userStr) {
    try {
      user = JSON.parse(userStr)
    } catch (e) {
      console.warn('Failed to parse user info from localStorage:', e)
    }
  }
  
  let loginAt = null
  if (loginAtStr) {
    const parsed = parseInt(loginAtStr, 10)
    if (!isNaN(parsed)) loginAt = parsed
  }
  
  let permissions = []
  if (permissionsStr) {
    try {
      permissions = JSON.parse(permissionsStr)
    } catch (e) {
      console.warn('Failed to parse permissions from localStorage:', e)
    }
  }
  
  return {
    token,
    refreshToken,
    expireAt,
    user,
    loginAt,
    permissions,
  }
}

