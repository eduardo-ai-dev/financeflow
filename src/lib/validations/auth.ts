import { z } from 'zod'
import {
  buildUserInputs,
  containsUserInfo,
  evaluatePasswordStrength,
} from '@/lib/password'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Formato de e-mail inválido'),
  password: z
    .string()
    .min(1, 'A senha é obrigatória')
    .min(6, 'A senha deve conter no mínimo 6 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Senha forte obrigatória (cadastro e redefinição): mínimo de 8 caracteres,
 * maiúscula, minúscula, número, símbolo e sem padrões previsíveis.
 * O login NÃO usa este schema para não bloquear contas criadas antes da política.
 */
export const strongPasswordSchema = z.string().superRefine((value, ctx) => {
  const failed = evaluatePasswordStrength(value).checks.find((check) => !check.passed)
  if (failed) {
    ctx.addIssue({ code: 'custom', message: failed.error })
  }
})

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'O nome completo é obrigatório')
      .max(120, 'O nome deve ter no máximo 120 caracteres'),
    email: z
      .string()
      .min(1, 'O e-mail é obrigatório')
      .email('Formato de e-mail inválido'),
    password: strongPasswordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Confirmação de senha obrigatória'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'As senhas não coincidem',
        path: ['confirmPassword'],
      })
    }
    if (containsUserInfo(data.password, buildUserInputs(data.fullName, data.email))) {
      ctx.addIssue({
        code: 'custom',
        message: 'A senha não pode conter o seu nome ou e-mail',
        path: ['password'],
      })
    }
  })

export type RegisterFormData = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Formato de e-mail inválido'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Confirmação de senha obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
