export type UserRole = 'CUSTOMER' | 'ADMIN'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: User
}
