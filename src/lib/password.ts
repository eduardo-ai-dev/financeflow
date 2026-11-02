/**
 * Política e medidor de força de senha do FinanceFlow.
 *
 * Uma senha só é aceita no cadastro / redefinição quando atinge o nível "Forte":
 *  - mínimo de 8 caracteres;
 *  - letra minúscula, letra maiúscula, número e símbolo;
 *  - sem senhas comuns, sequências (123456, abcde, qwerty) ou caracteres repetidos;
 *  - sem conter o nome ou o e-mail do próprio usuário (quando informados).
 *
 * A mesma função alimenta o medidor visual e o schema Zod, garantindo que a
 * interface e a validação nunca divirjam.
 */

export const MIN_PASSWORD_LENGTH = 8

export type PasswordScore = 0 | 1 | 2 | 3 | 4

export interface PasswordCheck {
  id: 'length' | 'lowercase' | 'uppercase' | 'number' | 'symbol' | 'pattern' | 'personal'
  /** Texto curto exibido na checklist do medidor */
  label: string
  /** Mensagem de erro de validação quando o requisito falha */
  error: string
  passed: boolean
}

export interface PasswordStrength {
  score: PasswordScore
  label: string
  checks: PasswordCheck[]
  isStrong: boolean
}

export const PASSWORD_LEVEL_LABELS: Record<PasswordScore, string> = {
  0: '',
  1: 'Muito fraca',
  2: 'Fraca',
  3: 'Média',
  4: 'Forte',
}

/** Senhas comuns (comparadas já normalizadas: minúsculas e sem símbolos). */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  '11111111',
  '00000000',
  'password',
  'password1',
  'password123',
  'qwerty123',
  'qwertyuiop',
  'abc12345',
  'abcd1234',
  'admin123',
  'senha123',
  'senhasenha',
  'minhasenha',
  'mudar123',
  'brasil123',
  'iloveyou',
  'letmein1',
  'welcome1',
  'financeflow',
  'financeflow1',
])

/** Raízes muito previsíveis; "raiz + dígitos" é considerado senha comum. */
const COMMON_ROOTS = new Set([
  'senha',
  'password',
  'qwerty',
  'admin',
  'brasil',
  'mudar',
  'teste',
  'welcome',
  'letmein',
  'abc',
  'financeflow',
])

const KEYBOARD_RUNS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

function normalize(password: string): string {
  return password.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

function hasLongSequence(value: string, minRun = 5): boolean {
  let up = 1
  let down = 1
  for (let i = 1; i < value.length; i++) {
    const diff = value.charCodeAt(i) - value.charCodeAt(i - 1)
    up = diff === 1 ? up + 1 : 1
    down = diff === -1 ? down + 1 : 1
    if (up >= minRun || down >= minRun) return true
  }
  return KEYBOARD_RUNS.some((row) => {
    for (let i = 0; i + minRun <= row.length; i++) {
      const chunk = row.slice(i, i + minRun)
      if (value.includes(chunk) || value.includes([...chunk].reverse().join(''))) return true
    }
    return false
  })
}

/** Detecta senhas comuns, sequências e repetições. */
export function isWeakPattern(password: string): boolean {
  const normalized = normalize(password)
  if (normalized.length === 0) return false
  if (COMMON_PASSWORDS.has(normalized)) return true
  if (COMMON_ROOTS.has(normalized.replace(/\d+$/, ''))) return true
  // Um único caractere repetido (aaaaaaaa) ou padrão curto repetido (abababab)
  if (/^(.+?)\1+$/u.test(normalized)) return true
  return hasLongSequence(normalized)
}

/** Verifica se a senha contém partes do nome/e-mail do usuário (≥ 3 caracteres). */
export function containsUserInfo(password: string, userInputs: string[] = []): boolean {
  const normalizedPassword = normalize(password)
  return userInputs
    .map((input) => normalize(input))
    .filter((input) => input.length >= 3)
    .some((input) => normalizedPassword.includes(input))
}

/**
 * Extrai termos pessoais (nome, sobrenomes e parte local do e-mail)
 * para impedir que sejam usados na senha.
 */
export function buildUserInputs(fullName?: string, email?: string): string[] {
  const nameParts = (fullName ?? '').split(/\s+/).filter(Boolean)
  const emailLocal = (email ?? '').split('@')[0] ?? ''
  return [...nameParts, emailLocal].filter((term) => term.trim().length > 0)
}

export function evaluatePasswordStrength(
  password: string,
  userInputs?: string[]
): PasswordStrength {
  const checks: PasswordCheck[] = [
    {
      id: 'length',
      label: `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`,
      error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
      passed: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: 'lowercase',
      label: 'Letra minúscula (a-z)',
      error: 'Inclua ao menos uma letra minúscula',
      passed: /\p{Ll}/u.test(password),
    },
    {
      id: 'uppercase',
      label: 'Letra maiúscula (A-Z)',
      error: 'Inclua ao menos uma letra maiúscula',
      passed: /\p{Lu}/u.test(password),
    },
    {
      id: 'number',
      label: 'Número (0-9)',
      error: 'Inclua ao menos um número',
      passed: /\d/.test(password),
    },
    {
      id: 'symbol',
      label: 'Símbolo (! @ # $ % & *)',
      error: 'Inclua ao menos um símbolo (ex.: ! @ # $ % & *)',
      passed: /[^\p{L}\p{N}\s]/u.test(password),
    },
  ]

  const baseCount = checks.filter((c) => c.passed).length

  const patternCheck: PasswordCheck = {
    id: 'pattern',
    label: 'Sem sequências ou senhas comuns',
    error: 'Evite senhas comuns, sequências (123, abc, qwerty) e caracteres repetidos',
    passed: password.length > 0 && !isWeakPattern(password),
  }
  checks.push(patternCheck)

  let personalCheck: PasswordCheck | null = null
  if (userInputs !== undefined) {
    personalCheck = {
      id: 'personal',
      label: 'Sem seu nome ou e-mail',
      error: 'A senha não pode conter o seu nome ou e-mail',
      passed: !containsUserInfo(password, userInputs),
    }
    checks.push(personalCheck)
  }

  const isStrong = password.length > 0 && checks.every((c) => c.passed)

  let score: PasswordScore
  if (password.length === 0) {
    score = 0
  } else if (isStrong) {
    score = 4
  } else {
    score = baseCount <= 2 ? 1 : baseCount === 3 ? 2 : 3
    // Senhas comuns/sequenciais nunca passam de "Muito fraca"; dados pessoais limitam a "Fraca".
    if (!patternCheck.passed) score = 1
    else if (personalCheck && !personalCheck.passed) score = Math.min(score, 2) as PasswordScore
  }

  return { score, label: PASSWORD_LEVEL_LABELS[score], checks, isStrong }
}
