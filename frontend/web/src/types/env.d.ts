/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_FILE_SERVICE_URL: string
  /** 固定租户ID，设置后登录页将跳过租户选择 */
  readonly VITE_FIXED_TENANT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

