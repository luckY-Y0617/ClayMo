/**
 * 数据库类型工具函数
 */

// 数据库类型枚举（与后端保持一致）
export enum DatabaseType {
  MySql = 0,
  SqlServer = 1,
  Sqlite = 2,
  Oracle = 3,
  PostgreSQL = 4,
}

// 数据库类型选项（用于下拉选择）
export interface DatabaseTypeOption {
  value: number
  label: string
  icon: string
}

// 数据库类型选项列表
export const DATABASE_TYPE_OPTIONS: DatabaseTypeOption[] = [
  { value: DatabaseType.MySql, label: 'MySQL', icon: '🐬' },
  { value: DatabaseType.SqlServer, label: 'SQL Server', icon: '🔷' },
  { value: DatabaseType.Sqlite, label: 'SQLite', icon: '📦' },
  { value: DatabaseType.Oracle, label: 'Oracle', icon: '🔴' },
  { value: DatabaseType.PostgreSQL, label: 'PostgreSQL', icon: '🐘' },
]

// 数据库类型映射（数字枚举值 -> 显示名称）
const DB_TYPE_MAP: Record<number, string> = {
  [DatabaseType.MySql]: 'MySQL',
  [DatabaseType.SqlServer]: 'SQL Server',
  [DatabaseType.Sqlite]: 'SQLite',
  [DatabaseType.Oracle]: 'Oracle',
  [DatabaseType.PostgreSQL]: 'PostgreSQL',
}

// 字符串类型映射（兼容后端可能返回的字符串格式）
const DB_TYPE_STRING_MAP: Record<string, string> = {
  MySql: 'MySQL',
  MySQL: 'MySQL',
  SqlServer: 'SQL Server',
  'SQL Server': 'SQL Server',
  Sqlite: 'SQLite',
  SQLite: 'SQLite',
  Oracle: 'Oracle',
  PostgreSQL: 'PostgreSQL',
  PostgreSql: 'PostgreSQL',
}

/**
 * 获取数据库类型的显示名称
 * @param dbType 数据库类型（数字或字符串）
 * @returns 显示名称
 */
export function getDbTypeLabel(dbType: string | number | undefined | null): string {
  if (dbType === undefined || dbType === null) {
    return '-'
  }

  // 处理数字类型
  if (typeof dbType === 'number') {
    return DB_TYPE_MAP[dbType] || `Unknown (${dbType})`
  }

  // 处理字符串类型
  return DB_TYPE_STRING_MAP[dbType] || dbType
}

/**
 * 获取数据库类型的图标
 * @param dbType 数据库类型（数字或字符串）
 * @returns 图标 emoji
 */
export function getDbTypeIcon(dbType: string | number | undefined | null): string {
  if (dbType === undefined || dbType === null) {
    return '❓'
  }

  // 统一转换为数字类型
  const numericType = typeof dbType === 'number' ? dbType : getDbTypeValue(dbType)
  
  const option = DATABASE_TYPE_OPTIONS.find(opt => opt.value === numericType)
  return option?.icon || '❓'
}

/**
 * 根据字符串获取数据库类型的数字值
 * @param dbTypeStr 数据库类型字符串
 * @returns 数字值
 */
export function getDbTypeValue(dbTypeStr: string): number | undefined {
  const normalized = dbTypeStr.toLowerCase()
  
  if (normalized.includes('mysql')) return DatabaseType.MySql
  if (normalized.includes('sqlserver') || normalized.includes('sql server')) return DatabaseType.SqlServer
  if (normalized.includes('sqlite')) return DatabaseType.Sqlite
  if (normalized.includes('oracle')) return DatabaseType.Oracle
  if (normalized.includes('postgres')) return DatabaseType.PostgreSQL
  
  return undefined
}

/**
 * 获取数据库连接字符串模板
 * @param dbType 数据库类型
 * @returns 连接字符串模板
 */
export function getConnectionStringTemplate(dbType: string | number): string {
  const numericType = typeof dbType === 'number' ? dbType : (getDbTypeValue(dbType as string) ?? DatabaseType.MySql)
  
  const templates: Record<number, string> = {
    [DatabaseType.MySql]: 'Server=localhost;Port=3306;Database=tenant_db;Uid=root;Password=your_password;',
    [DatabaseType.SqlServer]: 'Server=localhost;Database=tenant_db;User Id=sa;Password=your_password;TrustServerCertificate=True;',
    [DatabaseType.Sqlite]: 'Data Source=tenant.db',
    [DatabaseType.Oracle]: 'Data Source=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ORCL)));User Id=system;Password=your_password;',
    [DatabaseType.PostgreSQL]: 'Host=localhost;Port=5432;Database=tenant_db;Username=postgres;Password=your_password;',
  }
  
  return templates[numericType] || templates[DatabaseType.MySql]
}

/**
 * 验证数据库类型是否有效
 * @param dbType 数据库类型
 * @returns 是否有效
 */
export function isValidDbType(dbType: number): boolean {
  return dbType >= DatabaseType.MySql && dbType <= DatabaseType.PostgreSQL
}

