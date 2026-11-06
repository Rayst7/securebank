import type { LoginRequest, LoginResponse } from '../types/auth'
import { apiRequest } from './api'

export const authService = {
  login(payload: LoginRequest): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      auth: false,
    })
  },
}
