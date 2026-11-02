import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'

export function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setServerError(null)
    const { error } = await resetPasswordForEmail(data.email)

    if (error) {
      setServerError(error.message || 'Erro ao enviar e-mail de recuperação.')
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
        <h2 className="text-xl font-semibold tracking-tight">E-mail enviado!</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Se o endereço estiver cadastrado em nosso sistema, você receberá um link para redefinir sua senha em instantes.
        </p>
        <div className="mt-6">
          <Link to="/login">
            <Button variant="outline" className="w-full">
              Voltar para o login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para login
        </Link>
        <h2 className="text-xl font-semibold tracking-tight">Recuperar senha</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Digite seu e-mail cadastrado para receber o link de redefinição.
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
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isSubmitting}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Enviando link...
            </>
          ) : (
            'Enviar link de recuperação'
          )}
        </Button>
      </form>
    </div>
  )
}

