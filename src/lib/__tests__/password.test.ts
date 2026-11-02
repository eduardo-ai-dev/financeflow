import { describe, it, expect } from 'vitest'
import {
  buildUserInputs,
  containsUserInfo,
  evaluatePasswordStrength,
  isWeakPattern,
} from '@/lib/password'
import { registerSchema, resetPasswordSchema, loginSchema } from '@/lib/validations/auth'

describe('Política de senha — medidor de força', () => {
  it('classifica senha vazia no nível 0', () => {
    const result = evaluatePasswordStrength('')
    expect(result.score).toBe(0)
    expect(result.isStrong).toBe(false)
  })

  it('classifica senhas curtas como fracas', () => {
    expect(evaluatePasswordStrength('Ab1!').isStrong).toBe(false)
    expect(evaluatePasswordStrength('abc').score).toBe(1)
  })

  it('exige 8 caracteres, maiúscula, minúscula, número e símbolo', () => {
    expect(evaluatePasswordStrength('Xk9#mQ2$vL').isStrong).toBe(true)
    expect(evaluatePasswordStrength('Xk9#mQ2').isStrong).toBe(false) // 7 caracteres
    expect(evaluatePasswordStrength('xk9#mq2$vl').isStrong).toBe(false) // sem maiúscula
    expect(evaluatePasswordStrength('XK9#MQ2$VL').isStrong).toBe(false) // sem minúscula
    expect(evaluatePasswordStrength('Xkd#mQw$vL').isStrong).toBe(false) // sem número
    expect(evaluatePasswordStrength('Xk9mQ2vLpR').isStrong).toBe(false) // sem símbolo
  })

  it('classifica como Média quando falta apenas um requisito', () => {
    const result = evaluatePasswordStrength('Xk9mQ2vLpR')
    expect(result.score).toBe(3)
    expect(result.label).toBe('Média')
  })

  it('classifica como Forte (nível 4) quando todos os requisitos são atendidos', () => {
    const result = evaluatePasswordStrength('Xk9#mQ2$vL')
    expect(result.score).toBe(4)
    expect(result.label).toBe('Forte')
  })

  it('rejeita senhas comuns mesmo com todas as classes de caracteres', () => {
    expect(evaluatePasswordStrength('Senha@123').isStrong).toBe(false)
    expect(evaluatePasswordStrength('Password@1').isStrong).toBe(false)
    expect(evaluatePasswordStrength('Senha@123').score).toBe(1)
  })

  it('detecta sequências e repetições', () => {
    expect(isWeakPattern('abcde')).toBe(true)
    expect(isWeakPattern('12345')).toBe(true)
    expect(isWeakPattern('Qwerty!9')).toBe(true)
    expect(isWeakPattern('aaaaaaaa')).toBe(true)
    expect(isWeakPattern('Ab1!Ab1!')).toBe(true)
    expect(isWeakPattern('Xk9#mQ2$vL')).toBe(false)
  })

  it('rejeita senha que contém nome ou e-mail do usuário', () => {
    const inputs = buildUserInputs('Ana Silva', 'ana.silva@email.com')
    expect(containsUserInfo('Silva#2026Xk', inputs)).toBe(true)
    expect(containsUserInfo('Xk9#mQ2$vL', inputs)).toBe(false)
    expect(evaluatePasswordStrength('Silva#2026Xk', inputs).isStrong).toBe(false)
    expect(evaluatePasswordStrength('Xk9#mQ2$vL', inputs).isStrong).toBe(true)
  })
})

describe('Política de senha — schemas de autenticação', () => {
  const baseRegister = {
    fullName: 'Ana Silva',
    email: 'ana@email.com',
    password: 'Xk9#mQ2$vL',
    confirmPassword: 'Xk9#mQ2$vL',
  }

  it('aceita cadastro com senha forte', () => {
    expect(registerSchema.safeParse(baseRegister).success).toBe(true)
  })

  it('rejeita cadastro com senha fraca', () => {
    const result = registerSchema.safeParse({
      ...baseRegister,
      password: '123456',
      confirmPassword: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita cadastro quando a confirmação não coincide', () => {
    const result = registerSchema.safeParse({ ...baseRegister, confirmPassword: 'Outra#Senha9x' })
    expect(result.success).toBe(false)
  })

  it('rejeita cadastro com senha contendo o nome do usuário', () => {
    const result = registerSchema.safeParse({
      ...baseRegister,
      password: 'Silva#2026Xk',
      confirmPassword: 'Silva#2026Xk',
    })
    expect(result.success).toBe(false)
  })

  it('exige senha forte também na redefinição', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'fraca123', confirmPassword: 'fraca123' }).success
    ).toBe(false)
    expect(
      resetPasswordSchema.safeParse({ password: 'Xk9#mQ2$vL', confirmPassword: 'Xk9#mQ2$vL' })
        .success
    ).toBe(true)
  })

  it('mantém o login compatível com senhas antigas (sem exigir senha forte)', () => {
    expect(loginSchema.safeParse({ email: 'ana@email.com', password: 'antiga1' }).success).toBe(true)
  })
})
