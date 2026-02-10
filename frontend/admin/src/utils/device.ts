/**
 * 设备信息检测工具
 */

// 生成唯一的设备ID (基于浏览器指纹)
export function generateDeviceId(): string {
  const navigatorInfo = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|')
  
  // 简单的哈希函数
  let hash = 0
  for (let i = 0; i < navigatorInfo.length; i++) {
    const char = navigatorInfo.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return 'device_' + Math.abs(hash).toString(36)
}

// 生成会话ID
export function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
}

// 生成客户端ID
export function generateClientId(): string {
  const stored = localStorage.getItem('clientId')
  if (stored) return stored
  
  const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
  localStorage.setItem('clientId', clientId)
  return clientId
}

// 获取浏览器信息
export function getBrowserInfo(): string {
  const ua = navigator.userAgent
  
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome'
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari'
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'IE'
  if (ua.includes('Opera') || ua.includes('OPR/')) return 'Opera'
  
  return 'Unknown'
}

// 获取操作系统信息
export function getOSInfo(): string {
  const ua = navigator.userAgent
  
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  
  return 'Unknown'
}

// 获取设备类型
export function getDeviceType(): string {
  const ua = navigator.userAgent
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile'
  }
  return 'Desktop'
}

// 获取设备型号（仅移动设备）
export function getDeviceModel(): string | undefined {
  const ua = navigator.userAgent
  
  // iPhone
  const iphoneMatch = ua.match(/iPhone\s*(\w+)/)
  if (iphoneMatch) return `iPhone ${iphoneMatch[1]}`
  
  // iPad
  const ipadMatch = ua.match(/iPad/)
  if (ipadMatch) return 'iPad'
  
  // Android
  const androidMatch = ua.match(/Android.*;\s*([^;)]+)/)
  if (androidMatch && androidMatch[1]) return androidMatch[1].trim()
  
  return undefined
}

// 获取网络类型
export function getNetworkType(): string {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  if (connection) {
    if (connection.effectiveType) return connection.effectiveType // '4g', '3g', '2g', 'slow-2g'
    if (connection.type) return connection.type
  }
  
  return 'unknown'
}

// 获取浏览器指纹
export function getBrowserFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    navigator.hardwareConcurrency || 'unknown',
    navigator.maxTouchPoints || 0,
  ]
  
  const fingerprint = components.join('|')
  
  // 简单哈希
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return 'fp_' + Math.abs(hash).toString(36)
}

// 获取完整的设备信息对象
export function getDeviceInfo() {
  return {
    sessionId: generateSessionId(),
    clientId: generateClientId(),
    deviceId: generateDeviceId(),
    fingerprint: getBrowserFingerprint(),
    browser: getBrowserInfo(),
    os: getOSInfo(),
    deviceType: getDeviceType(),
    deviceModel: getDeviceModel(),
    networkType: getNetworkType(),
    loginSource: 'web',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    appChannel: 'web',
  }
}

