/**
 * ClayMo 统一错误码
 *
 * 从 codes.json 自动生成，请勿手动修改
 * 如需新增错误码，请编辑 codes.json 后运行 npm run generate
 */

import codesJson from './codes.json'

// 类型定义
export interface ErrorCodeDefinition {
  message: string
  httpStatus: number
}

export interface ErrorCategory {
  name: string
  codes: Record<string, ErrorCodeDefinition>
}

export interface ErrorCodesSchema {
  version: string
  description: string
  categories: Record<string, ErrorCategory>
}

// 加载错误码定义
const schema = codesJson as unknown as ErrorCodesSchema

/**
 * 错误码映射表（code -> message）
 */
export const ERROR_CODE_MAP: Record<string, string> = {}

/**
 * 错误码完整定义（code -> definition）
 */
export const ERROR_DEFINITIONS: Record<string, ErrorCodeDefinition> = {}

// 构建映射表
for (const [category, categoryDef] of Object.entries(schema.categories)) {
  for (const [code, def] of Object.entries(categoryDef.codes)) {
    const fullCode = `${category}:${code}`
    ERROR_CODE_MAP[fullCode] = def.message
    ERROR_DEFINITIONS[fullCode] = def
  }
}

/**
 * 根据错误码获取友好提示
 */
export function getErrorMessage(code: string | null | undefined, fallbackMessage?: string): string {
  if (code && ERROR_CODE_MAP[code]) {
    return ERROR_CODE_MAP[code]
  }
  return fallbackMessage || '操作失败，请稍后重试'
}

/**
 * 根据错误码获取完整定义
 */
export function getErrorDefinition(code: string): ErrorCodeDefinition | null {
  return ERROR_DEFINITIONS[code] || null
}

/**
 * 检查是否为已知错误码
 */
export function isKnownErrorCode(code: string): boolean {
  return code in ERROR_CODE_MAP
}

/**
 * 获取所有错误类别
 */
export function getCategories(): string[] {
  return Object.keys(schema.categories)
}

/**
 * 获取某个类别下的所有错误码
 */
export function getCodesByCategory(category: string): string[] {
  const categoryDef = schema.categories[category]
  if (!categoryDef) return []
  return Object.keys(categoryDef.codes).map((code) => `${category}:${code}`)
}

// 导出版本信息
export const ERROR_CODES_VERSION = schema.version

// 默认导出
export default {
  ERROR_CODE_MAP,
  ERROR_DEFINITIONS,
  getErrorMessage,
  getErrorDefinition,
  isKnownErrorCode,
  getCategories,
  getCodesByCategory,
  version: ERROR_CODES_VERSION,
}

