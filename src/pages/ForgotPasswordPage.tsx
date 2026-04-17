import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/api/authService'
import {
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type VerifyOtpFormValues,
  type ResetPasswordFormValues,
} from '@/features/auth/schemas'
import { cn } from '@/lib/utils'
import type { AxiosError } from 'axios'
import type { ApiError } from '@/types/api'

type Step = 'forgot' | 'otp' | 'reset'

/* ─── Icons ─── */
function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#F3F4F6" />
      <path d="M16 18l8 5.5L32 18" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="16" width="20" height="16" rx="2" stroke="#374151" strokeWidth="2" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#ECFDF5" />
      <circle cx="24" cy="24" r="16" fill="#D1FAE5" />
      <path d="M17 24l4.5 4.5L31 19" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('forgot')
  const [identifier, setIdentifier] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Step 1: Forgot password form
  const forgotForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  // Step 2: OTP verification form
  const otpForm = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
  })

  // Step 3: Reset password form
  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const handleForgot = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      await authService.forgotPassword(values)
      setIdentifier(values.identifier)
      setStep('otp')
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>
      setError(axiosError.response?.data?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtp = async (values: VerifyOtpFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await authService.verifyOtp({
        identifier,
        code: values.code,
      })
      setResetToken(data.data.reset_token)
      setStep('reset')
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>
      setError(axiosError.response?.data?.message ?? 'OTP ไม่ถูกต้อง')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async (values: ResetPasswordFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      await authService.resetPassword({
        reset_token: resetToken,
        new_password: values.new_password,
      })
      setShowSuccessModal(true)
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>
      setError(axiosError.response?.data?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setIsLoading(false)
    }
  }

  const stepIndex = step === 'forgot' ? 0 : step === 'otp' ? 1 : 2

  const handleBack = () => {
    setError(null)
    if (step === 'otp') setStep('forgot')
    else if (step === 'reset') setStep('otp')
    else navigate('/login')
  }

  return (
    <div className="auth-page">
      <div className="flex w-full max-w-lg flex-col items-center gap-8"
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
          {/* Back button */}
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon />
            <span>{step === 'forgot' ? 'กลับไปหน้าเข้าสู่ระบบ' : 'ย้อนกลับ'}</span>
          </button>

          {/* Step Indicator */}
          <div className="step-indicator">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'step-dot',
                  i < stepIndex && 'done',
                  i === stepIndex && 'active',
                )}
              />
            ))}
          </div>

          {/* Step 1: Forgot Password */}
          {step === 'forgot' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h1 className="text-2xl font-bold leading-tight text-gray-900">
                  ตั้งค่ารหัสผ่าน
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  เราจะส่งวิธีรีเซ็ตรหัสผ่านไปยังอีเมลของคุณ หากเข้าอีเมลไม่ได้ให้ลอง{' '}
                  <span className="font-medium text-gray-900 cursor-pointer hover:underline">
                    กู้คืนบัญชี
                  </span>
                </p>
              </div>

              <form onSubmit={forgotForm.handleSubmit(handleForgot)} className="flex flex-col gap-5">
                <div>
                  <label htmlFor="forgot-identifier" className="auth-label">
                    อีเมล
                  </label>
                  <input
                    id="forgot-identifier"
                    type="text"
                    placeholder="กรุณาใส่อีเมลของท่าน"
                    autoComplete="email"
                    className={cn('auth-input', forgotForm.formState.errors.identifier && 'error')}
                    {...forgotForm.register('identifier')}
                  />
                  {forgotForm.formState.errors.identifier && (
                    <p className="auth-error">{forgotForm.formState.errors.identifier.message}</p>
                  )}
                </div>

                {error && <div className="auth-api-error animate-shake">{error}</div>}

                <button type="submit" className="auth-btn" disabled={isLoading}>
                  {isLoading && <span className="spinner" />}
                  ตั้งรหัสผ่านใหม่
                </button>
              </form>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <div className="animate-fade-in">
              <div className="mb-6 flex flex-col items-center text-center">
                <MailIcon />
                <h1 className="mt-4 text-2xl font-bold leading-tight text-gray-900">
                  ยืนยัน OTP
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  กรุณากรอกรหัส OTP ที่ส่งไปยัง{' '}
                  <span className="font-medium text-gray-900">{identifier}</span>
                </p>
              </div>

              <form onSubmit={otpForm.handleSubmit(handleOtp)} className="flex flex-col gap-5">
                <div>
                  <label htmlFor="otp-code" className="auth-label">
                    รหัส OTP
                  </label>
                  <input
                    id="otp-code"
                    type="text"
                    placeholder="กรอกรหัส OTP 6 หลัก"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    className={cn(
                      'auth-input text-center text-lg tracking-[0.5em]',
                      otpForm.formState.errors.code && 'error',
                    )}
                    {...otpForm.register('code')}
                  />
                  {otpForm.formState.errors.code && (
                    <p className="auth-error">{otpForm.formState.errors.code.message}</p>
                  )}
                </div>

                {error && <div className="auth-api-error animate-shake">{error}</div>}

                <button type="submit" className="auth-btn" disabled={isLoading}>
                  {isLoading && <span className="spinner" />}
                  ยืนยัน
                </button>

                <p className="text-center text-sm text-gray-500">
                  ไม่ได้รับรหัส?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      forgotForm.handleSubmit(handleForgot)()
                    }}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    ส่งใหม่
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* Step 3: Reset Password */}
          {step === 'reset' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h1 className="text-2xl font-bold leading-tight text-gray-900">
                  เปลี่ยนรหัสผ่านใหม่
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  รหัสผ่านของคุณควรตั้งต่างจากเดิมก่อนหน้านี้
                </p>
              </div>

              <form onSubmit={resetForm.handleSubmit(handleReset)} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="new-password" className="auth-label">
                    รหัสผ่านใหม่
                  </label>
                  <div className="password-wrapper">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      autoComplete="new-password"
                      className={cn('auth-input', resetForm.formState.errors.new_password && 'error')}
                      style={{ paddingRight: '2.75rem' }}
                      {...resetForm.register('new_password')}
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
                  {resetForm.formState.errors.new_password && (
                    <p className="auth-error">{resetForm.formState.errors.new_password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm-password" className="auth-label">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="password-wrapper">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      autoComplete="new-password"
                      className={cn('auth-input', resetForm.formState.errors.confirm_password && 'error')}
                      style={{ paddingRight: '2.75rem' }}
                      {...resetForm.register('confirm_password')}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {resetForm.formState.errors.confirm_password && (
                    <p className="auth-error">{resetForm.formState.errors.confirm_password.message}</p>
                  )}
                </div>

                {error && <div className="auth-api-error animate-shake">{error}</div>}

                <button type="submit" className="auth-btn mt-2" disabled={isLoading}>
                  {isLoading && <span className="spinner" />}
                  ยืนยัน
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400" style={{ animation: 'fadeIn 0.8s ease-out' }}>
          © {new Date().getFullYear()} สุดยอดมอเตอร์ — ระบบจัดการร้าน
        </p>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircleIcon />
              <div>
                <p className="text-xl font-bold text-gray-900">
                  เปลี่ยนรหัสผ่านสำเร็จ
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่
                </p>
              </div>
            </div>
            <button
              className="auth-btn mt-6"
              onClick={() => navigate('/login')}
            >
              ไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
