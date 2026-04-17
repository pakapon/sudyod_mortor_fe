import { z } from 'zod'

export const loginSchema = z.object({
  identifier: z.string().min(1, 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'กรุณากรอกอีเมล'),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const verifyOtpSchema = z.object({
  code: z.string().min(1, 'กรุณากรอก OTP'),
})

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>

export const resetPasswordSchema = z
  .object({
    new_password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
    confirm_password: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirm_password'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
