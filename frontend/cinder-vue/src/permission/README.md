# 权限管理系统使用文档

## 概述

本权限管理系统提供了一套完整的权限控制解决方案，包括：
- 权限状态管理（Pinia Store）
- 路由权限守卫
- 菜单权限过滤
- 组件级权限控制（指令和组件）
- 权限工具函数

## 目录结构

```
src/
├── permission/
│   ├── index.js                 # 统一导出
│   ├── permission.constants.js  # 权限常量定义
│   ├── menuFilter.js            # 菜单过滤函数
│   ├── directive.js             # 权限指令实现
│   └── README.md                # 本文档
├── stores/
│   └── permission.js            # 权限 Store
├── composables/
│   └── usePermission.js         # 权限 Composable
├── router/
│   └── guards.js                 # 路由权限守卫
└── components/
    └── PermissionGate.vue        # 权限门控组件
```

## 一、权限常量定义

所有权限码应在 `permission.constants.js` 中统一定义：

```javascript
import { KB_PERMISSIONS, SYSTEM_PERMISSIONS } from '@/permission'

// 使用权限常量
const canEdit = has(KB_PERMISSIONS.DOC_EDIT)
```

## 二、权限 Store 使用

### 设置权限

在登录成功时，从登录响应中获取 `permissionCodes` 并设置：

```javascript
import { usePermissionStore } from '@/stores/permission'

const permissionStore = usePermissionStore()
permissionStore.setPermissions(['system.users.view', 'kb.doc.edit', ...])
```

### 重置权限

在登出时清空权限：

```javascript
permissionStore.reset()
```

## 三、权限判断工具

### 在组件中使用 usePermission

```vue
<template>
  <div>
    <button v-if="has('system.users.manage')">管理用户</button>
    <button v-if="hasAny(['system.users.view', 'system.users.manage')]">查看用户</button>
  </div>
</template>

<script setup>
import { usePermission } from '@/composables/usePermission'

const { has, hasAny, hasAll, can } = usePermission()
</script>
```

### 在 Store 或工具函数中使用

```javascript
import { usePermissionStore } from '@/stores/permission'

const permissionStore = usePermissionStore()

if (permissionStore.has('system.users.manage')) {
  // 执行操作
}
```

## 四、路由权限控制

在路由配置中添加 `meta` 字段声明权限需求：

```javascript
{
  path: '/system/users',
  component: UserManagement,
  meta: {
    requiredPermissions: ['system.users.view'],
    requireAll: false, // 默认 false，表示 hasAny
  }
}
```

路由守卫会自动检查权限，无权限时会重定向到首页。

## 五、菜单权限控制

### 定义菜单配置

```javascript
const menuConfig = [
  {
    name: '系统管理',
    path: '/system',
    permissionCode: 'system.manage', // 单个权限码
    children: [
      {
        name: '用户管理',
        path: '/system/users',
        requiredPermissions: ['system.users.view'], // 权限数组
        requireAll: false, // 任意一个权限即可
      },
      {
        name: '角色管理',
        path: '/system/roles',
        permissionCode: 'system.roles.manage',
      },
    ]
  }
]
```

### 过滤菜单

```vue
<template>
  <nav>
    <MenuItem 
      v-for="menu in filteredMenus" 
      :key="menu.path"
      :menu="menu"
    />
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { filterMenuTree } from '@/permission'
import { menuConfig } from './menuConfig'

const filteredMenus = computed(() => {
  return filterMenuTree(menuConfig)
})
</script>
```

## 六、组件级权限控制

### 使用 v-permission 指令

#### 隐藏元素（默认）

```vue
<template>
  <!-- 单个权限 -->
  <button v-permission="'system.users.manage'">删除用户</button>
  
  <!-- 多个权限（任意一个） -->
  <button v-permission="['system.users.view', 'system.users.manage']">查看用户</button>
  
  <!-- 多个权限（全部需要） -->
  <button v-permission.all="['system.users.view', 'system.users.manage']">高级操作</button>
</template>
```

#### 禁用元素

```vue
<template>
  <!-- 权限不足时禁用按钮 -->
  <button v-permission.disable="'system.users.manage'">删除用户</button>
</template>
```

### 使用 PermissionGate 组件

```vue
<template>
  <!-- 基本使用 -->
  <PermissionGate :required="'system.users.manage'">
    <button>删除用户</button>
  </PermissionGate>
  
  <!-- 多个权限（任意一个） -->
  <PermissionGate :required="['system.users.view', 'system.users.manage']">
    <UserList />
  </PermissionGate>
  
  <!-- 多个权限（全部需要） -->
  <PermissionGate 
    :required="['system.users.view', 'system.users.manage']"
    :require-all="true"
  >
    <AdvancedUserPanel />
  </PermissionGate>
  
  <!-- 显示 fallback 内容 -->
  <PermissionGate 
    :required="'system.users.manage'"
    :show-fallback="true"
    fallback-text="无权限访问"
  >
    <UserManagement />
    <template #fallback>
      <div>您没有权限访问此功能</div>
    </template>
  </PermissionGate>
</template>
```

## 七、权限数据刷新

### 登录时设置权限

登录接口返回 `permissionCodes` 后，会自动设置到权限 Store（已在 `auth.js` 中实现）。

### 刷新 Token 时更新权限

如果刷新 Token 接口返回新的 `permissionCodes`，会自动更新（已在 `auth.js` 中实现）。

### 手动刷新权限

如果需要单独拉取权限：

```javascript
import { usePermissionStore } from '@/stores/permission'
import { sysApi } from '@/api/sys.api'

const permissionStore = usePermissionStore()

async function refreshPermissions() {
  const res = await sysApi.auth.getPermissions() // 假设有该接口
  permissionStore.setPermissions(res.permissionCodes)
}
```

## 八、ABAC 扩展（预留）

对于需要数据级权限的场景，使用 `can` 方法：

```javascript
const { can } = usePermission()

// 当前实现：仅基于权限码
if (can('kb.doc.edit')) {
  // 允许编辑
}

// 未来扩展：支持上下文
if (can('kb.doc.edit', { ownerId: currentUserId, isPrivate: true })) {
  // 根据资源属性判断
}
```

## 九、最佳实践

1. **使用权限常量**：不要硬编码权限码字符串，使用 `permission.constants.js` 中定义的常量。

2. **集中权限判断**：所有权限判断都通过 `has` / `hasAny` / `hasAll` / `can`，不要直接访问 `permissionCodes` 数组。

3. **路由权限声明**：在路由配置中明确声明权限需求，而不是在页面组件中判断。

4. **菜单权限过滤**：始终使用 `filterMenuTree` 过滤菜单，而不是在渲染时手动判断。

5. **组件权限控制**：优先使用 `v-permission` 指令或 `PermissionGate` 组件，避免在组件内部写权限判断逻辑。

## 十、常见问题

### Q: 如何添加新的权限码？

A: 在 `permission.constants.js` 中添加常量定义和说明：

```javascript
export const KB_PERMISSIONS = {
  // ... 现有权限
  DOC_EXPORT: 'kb.doc.export', // 新增
}

export const PERMISSION_DESCRIPTIONS = {
  // ... 现有说明
  [KB_PERMISSIONS.DOC_EXPORT]: '导出文档', // 新增说明
}
```

### Q: 路由权限检查失败后如何自定义跳转？

A: 修改 `router/guards.js` 中的重定向逻辑：

```javascript
// 在 setupPermissionGuard 函数中
if (!hasPermission) {
  // 可以重定向到专门的 403 页面
  next({ path: '/403' })
  // 或者显示错误信息
  // next({ path: '/home', query: { error: 'no_permission' } })
}
```

### Q: 如何实现更复杂的权限判断（如资源级权限）？

A: 扩展 `can` 方法的实现，在 `stores/permission.js` 中添加基于 context 的判断逻辑。

