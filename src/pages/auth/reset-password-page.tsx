import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth'
import { evaluatePasswordStrength } from '@/lib/password'
import { PasswordStrengthMeter } from '@/components/password-strength-meter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const passwordValue = useWatch({ control, name: 'password' }) ?? ''
  const isPasswordStrong = evaluatePasswordStrength(passwordValue).isStrong

  async function onSubmit(data: ResetPasswordFormData) {
    setServerError(null)
    const { error } = await updatePassword(data.password)

    if (error) {
      setServerError(error.message || 'Erro ao atualizar a senha.')
      return
    }

    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="text-center py-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success mb-3">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Senha redefinida!</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Sua nova senha foi atualizada com sucesso. Você já pode acessar a plataforma normalmente.
        </p>
        <div className="mt-6">
          <Button onClick={() => navigate('/', { replace: true })} className="w-full">
            Ir para o Painel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Definir nova senha</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Crie uma nova senha segura para sua conta.
        </p>
      </div>

      {serverError && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo de 8 caracteres, forte"
            autoComplete="new-password"
            disabled={isSubmitting}
            {...register('password')}
          />
          <PasswordStrengthMeter password={passwordValue} />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita sua nova senha"
            autoComplete="new-password"
            disabled={isSubmitting}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          disabled={isSubmitting || !isPasswordStrong}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Atualizando senha...
            </>
          ) : (
            'Atualizar Senha'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Lembrou da senha anterior?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Acesse aqui
        </Link>
      </div>
    </div>
  )
}
