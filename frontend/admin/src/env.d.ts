/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /**
   * 固定租户ID配置
   * - 留空或不设置：登录页仅显示 Host 模式
   * - 设置租户GUID：登录页显示 Host/租户 模式切换，租户模式使用此ID
   * 
   * 配置方式：在 .env.local 文件中设置
   * @example VITE_FIXED_TENANT_ID=12345678-1234-1234-1234-123456789abc
   */
  readonly VITE_FIXED_TENANT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

