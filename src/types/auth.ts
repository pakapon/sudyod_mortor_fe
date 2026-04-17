// Auth Request Types
export interface LoginPayload {
  identifier: string
  password: string
}

export interface ForgotPasswordPayload {
  identifier: string
}

export interface VerifyOtpPayload {
  identifier: string
  code: string
}

export interface ResetPasswordPayload {
  reset_token: string
  new_password: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface RefreshTokenPayload {
  refresh_token: string
}

// Auth Response Types
export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface Employee {
  id: number
  branch_id: number
  position_id: number
  employee_code: string
  first_name: string
  last_name: string
  email: string
  phone: string
  status: string
  branch: {
    id: number
    name: string
  }
  position: {
    id: number
    name: string
  }
  work_schedule?: {
    id: number
    name: string
    login_start_time: string  // "HH:mm"
    login_end_time: string    // "HH:mm"
  } | null
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  employee: Employee
}

export interface VerifyOtpResponse {
  reset_token: string
}

export interface Session {
  id: string
  ip_address: string
  user_agent: string
  last_active_at: string
  created_at: string
}
