import { http, API } from '@/utils/http'
import type { LoginResponse, UserInfo } from '@/types'

export interface LoginParams {
  userName: string
  password: string
  captchaId?: string
  captchaCode?: string
  tenantId?: string
}

export interface RegisterParams {
  userName: string
  password: string
  email?: string
  phoneNumber?: string
  verificationCode?: string
}

export const authApi = {
  /** POST /api/app/auth/login */
  login(data: LoginParams): Promise<LoginResponse> {
    const { tenantId, ...loginData } = data
    const config = tenantId
      ? {
          headers: {
            __tenant: tenantId,
          },
        }
      : {}
    return http.post(`${API}/app/auth/login`, loginData, config)
  },

  /** PUT /api/app/auth/refresh */
  refresh(): Promise<LoginResponse> {
    return http.put(`${API}/app/auth/refresh`, {})
  },

  register(data: RegisterParams): Promise<void> {
    return http.post(`${API}/app/auth/register`, data)
  },

  sendVerificationCode(data: { phoneNumber?: string; email?: string }): Promise<void> {
    return http.post(`${API}/app/auth/send-verification-code`, data)
  },

  /** POST /api/app/auth/logout */
  logout(): Promise<void> {
    return http.post(`${API}/app/auth/logout`, null)
  },

  /** GET /api/app/users/me */
  getCurrentUser(): Promise<UserInfo> {
    return http.get(`${API}/app/users/me`)
  },
}

export interface CaptchaResponse {
  id: string
  imageBase64: string
}

export const captchaApi = {
  getImageCaptcha(): Promise<CaptchaResponse> {
    return http.get(`${API}/app/captcha/image-captcha`)
  },
}

export const smsApi = {
  sendVerificationCode(data: { phoneNumber: string }): Promise<void> {
    return http.post(`${API}/app/security/sms/send-code`, data)
  },
}

export const teamApi = {
  getTeamMembers(teamId: string): Promise<unknown[]> {
    return http.get(`${API}/app/teams/${teamId}/members`)
  },
}
