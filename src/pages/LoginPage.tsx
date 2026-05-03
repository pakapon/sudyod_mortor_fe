import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas'
import { cn } from '@/lib/utils'

/* ─── Icons ─── */
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}


export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    clearError()
    try {
      await login(values)
      navigate('/')
    } catch {
      // error is handled by store
    }
  }

  return (
    <div className="auth-page">
      <div className="flex w-full max-w-md flex-col items-center gap-8"
           style={{ animation: 'cardSlideUp 0.5s ease-out' }}>
        {/* Logo */}
        <img
          src="/logo.svg"
          alt="สุดยอดมอเตอร์"
          className="h-10 object-contain"
          style={{ animation: 'fadeIn 0.6s ease-out' }}
        />

        {/* Card */}
        <div className="auth-card">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            เข้าสู่ระบบ
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Email / Phone */}
            <div>
              <label htmlFor="login-identifier" className="auth-label">
                อีเมล หรือ เบอร์โทร
              </label>
              <input
                id="login-identifier"
                type="text"
                placeholder="อีเมล หรือ เบอร์โทร"
                autoComplete="email"
                className={cn('auth-input', errors.identifier && 'error')}
                {...register('identifier')}
              />
              {errors.identifier && (
                <p className="auth-error">{errors.identifier.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="auth-label">
                รหัสผ่าน
              </label>
              <div className="password-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className={cn('auth-input', errors.password && 'error')}
                  style={{ paddingRight: '2.75rem' }}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p className="auth-error">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-gray-900 hover:text-gray-700 hover:underline transition-colors"
              >
                ลืมรหัสผ่าน
              </Link>
            </div>

            {/* API Error */}
            {error && (
              <div className="auth-api-error animate-shake">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="auth-btn"
              disabled={isLoading}
            >
              {isLoading && <span className="spinner" />}
              เข้าสู่ระบบ
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400" style={{ animation: 'fadeIn 0.8s ease-out' }}>
          © {new Date().getFullYear()} สุดยอดมอเตอร์ — ระบบจัดการร้าน
        </p>
      </div>

      {/* Success Modal removed — redirect happens directly in onSubmit */}
    </div>
  )
}
