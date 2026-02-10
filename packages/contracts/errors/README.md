# @claymo/error-codes

ClayMo 统一错误码定义，前后端共享。

## 安装

```bash
npm install @claymo/error-codes
# 或
pnpm add @claymo/error-codes
```

## 使用

### 获取错误消息

```typescript
import { getErrorMessage, ERROR_CODE_MAP } from '@claymo/error-codes'

// 根据错误码获取友好提示
const msg = getErrorMessage('Identity:LoginFailed')
// => "用户名或密码错误"

// 带默认值
const msg2 = getErrorMessage('Unknown:Code', '操作失败')
// => "操作失败"

// 直接访问映射表
console.log(ERROR_CODE_MAP['Permission:Forbidden'])
// => "您没有权限执行此操作"
```

### 获取完整定义

```typescript
import { getErrorDefinition } from '@claymo/error-codes'

const def = getErrorDefinition('Identity:TokenExpired')
// => { message: "登录已过期，请重新登录", httpStatus: 401 }
```

### 检查错误码

```typescript
import { isKnownErrorCode } from '@claymo/error-codes'

if (isKnownErrorCode(error.code)) {
  // 已知错误，显示友好提示
} else {
  // 未知错误，显示通用提示
}
```

### 获取错误分类

```typescript
import { getCategories, getCodesByCategory } from '@claymo/error-codes'

console.log(getCategories())
// => ['Identity', 'Permission', 'Tenant', 'Business', 'Kb', 'File', 'System']

console.log(getCodesByCategory('Identity'))
// => ['Identity:LoginFailed', 'Identity:UserNotFound', ...]
```

## 错误码格式

错误码采用 `Category:Code` 格式：

| 分类 | 说明 | 示例 |
|------|------|------|
| Identity | 身份认证 | `Identity:LoginFailed` |
| Permission | 权限相关 | `Permission:Forbidden` |
| Tenant | 租户相关 | `Tenant:NotFound` |
| Business | 通用业务 | `Business:ValidationFailed` |
| Kb | 知识库 | `Kb:DocumentNotFound` |
| File | 文件服务 | `File:TooLarge` |
| System | 系统错误 | `System:Timeout` |

## 新增错误码

编辑 `codes.json` 文件：

```json
{
  "categories": {
    "MyCategory": {
      "name": "我的分类",
      "codes": {
        "MyError": {
          "message": "错误描述",
          "httpStatus": 400
        }
      }
    }
  }
}
```

然后运行构建：

```bash
pnpm build
```

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build
```

