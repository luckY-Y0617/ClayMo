import { usePermissionStore } from '@/stores/permission'

/**
 * 权限指令 v-permission
 * 
 * 使用方式：
 * 1. 隐藏元素（默认）：v-permission="'system.users.manage'"
 * 2. 禁用元素：v-permission.disable="'system.users.manage'"
 * 3. 多个权限（任意一个）：v-permission="['system.users.view', 'system.users.manage']"
 * 4. 多个权限（全部需要）：v-permission.all="['system.users.view', 'system.users.manage']"
 * 
 * 修饰符说明：
 * - .disable: 权限不足时，不移除元素，但设置为禁用状态
 * - .all: 要求所有权限都满足（默认是 hasAny）
 */
export const permissionDirective = {
  mounted(el, binding) {
    checkPermission(el, binding)
  },

  updated(el, binding) {
    checkPermission(el, binding)
  },
}

/**
 * 检查权限并应用相应的行为
 */
function checkPermission(el, binding) {
  const permissionStore = usePermissionStore()
  const { value, modifiers } = binding

  // 如果没有传入权限值，则默认显示
  if (!value) {
    restoreElement(el, modifiers.disable)
    return
  }

  // 判断是否有权限
  let hasPermission = false

  if (Array.isArray(value)) {
    // 数组：多个权限
    if (modifiers.all) {
      // 要求所有权限都满足
      hasPermission = permissionStore.hasAll(value)
    } else {
      // 任意一个权限满足即可
      hasPermission = permissionStore.hasAny(value)
    }
  } else if (typeof value === 'string') {
    // 字符串：单个权限
    hasPermission = permissionStore.has(value)
  } else {
    // 其他类型，默认显示
    restoreElement(el, modifiers.disable)
    return
  }

  // 根据修饰符决定行为
  if (modifiers.disable) {
    // disable 模式：权限不足时禁用元素
    if (!hasPermission) {
      el.disabled = true
      el.style.pointerEvents = 'none'
      el.style.opacity = '0.5'
      el.style.cursor = 'not-allowed'
      
      // 添加 tooltip 提示（如果元素支持 title 属性）
      if (!el.getAttribute('data-permission-tooltip')) {
        el.setAttribute('data-permission-tooltip', 'true')
        el.title = '无权限执行此操作'
      }
    } else {
      // 有权限时恢复元素
      restoreElement(el, true)
    }
  } else {
    // 默认模式：权限不足时移除元素
    if (!hasPermission) {
      // 如果元素已经被注释节点替换，则不再处理
      if (el.nodeType === Node.COMMENT_NODE) {
        return
      }
      
      // 保存原始元素的引用到注释节点
      const comment = document.createComment('v-permission: 无权限')
      if (el.parentNode) {
        // 保存原始元素的引用
        comment._permissionElement = el
        el.parentNode.replaceChild(comment, el)
      }
    } else {
      // 有权限时，如果元素被注释节点替换，则恢复
      restoreElement(el, false)
    }
  }
}

/**
 * 恢复元素状态
 */
function restoreElement(el, isDisableMode) {
  if (isDisableMode) {
    // 恢复禁用状态
    el.disabled = false
    el.style.pointerEvents = ''
    el.style.opacity = ''
    el.style.cursor = ''
    
    // 移除 tooltip
    if (el.getAttribute('data-permission-tooltip') === 'true') {
      el.removeAttribute('data-permission-tooltip')
      el.title = ''
    }
  } else {
    // 如果是注释节点，尝试恢复原始元素
    if (el.nodeType === Node.COMMENT_NODE && el._permissionElement) {
      const originalEl = el._permissionElement
      if (el.parentNode) {
        el.parentNode.replaceChild(originalEl, el)
      }
    }
  }
}
