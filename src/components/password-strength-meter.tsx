import { Check, X } from 'lucide-react'
import { evaluatePasswordStrength } from '@/lib/password'

interface PasswordStrengthMeterProps {
  password: string
  /** Nome/e-mail do usuário: a senha não pode conter esses termos */
  userInputs?: string[]
}

const SEGMENT_COLORS: Record<number, string> = {
  1: 'bg-rose-500',
  2: 'bg-orange-500',
  3: 'bg-amber-500',
  4: 'bg-emerald-500',
}

const LABEL_COLORS: Record<number, string> = {
  1: 'text-rose-600 dark:text-rose-400',
  2: 'text-orange-600 dark:text-orange-400',
  3: 'text-amber-600 dark:text-amber-400',
  4: 'text-emerald-600 dark:text-emerald-400',
}

export function PasswordStrengthMeter({ password, userInputs }: PasswordStrengthMeterProps) {
  const { score, label, checks, isStrong } = evaluatePasswordStrength(password, userInputs)

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-4 gap-1" role="presentation">
          {[1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className={`h-1.5 rounded-full transition-colors ${
                score >= segment ? SEGMENT_COLORS[score] : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span
          className={`min-w-[4.5rem] text-right text-xs font-semibold ${
            score > 0 ? LABEL_COLORS[score] : 'text-muted-foreground'
          }`}
        >
          {label || 'Força da senha'}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className={`flex items-center gap-1.5 text-[11px] ${
              check.passed && password.length > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            }`}
          >
            {check.passed && password.length > 0 ? (
              <Check className="size-3 shrink-0" />
            ) : (
              <X className="size-3 shrink-0 opacity-60" />
            )}
            <span>{check.label}</span>
          </li>
        ))}
      </ul>

      {password.length > 0 && !isStrong && (
        <p className="text-[11px] text-muted-foreground">
          Só é possível continuar com uma senha <strong>Forte</strong>.
        </p>
      )}
    </div>
  )
}
