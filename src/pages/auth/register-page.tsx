import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: RegisterFormData) {
    setServerError(null)
    const result = await signUp({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
    })

    if (result.error) {
      if (result.error.message.includes('User already registered')) {
        setServerError('Este e-mail já está cadastrado. Tente entrar.')
      } else if (result.error.message.includes('rate limit')) {
        setServerError('Limite de envio de e-mails atingido temporariamente pelo Supabase. Aguarde alguns minutos ou desative a opção "Confirm email" no painel do Supabase para cadastro imediato.')
      } else {
        setServerError(result.error.message || 'Erro ao criar conta.')
      }
      return
    }

    if (result.requiresEmailConfirmation) {
      setRequiresConfirmation(true)
    } else {
      navigate('/', { replace: true })
    }
  }

  if (requiresConfirmation) {
    return (
      <div className="text-center py-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success mb-3">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Confirme seu e-mail</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Enviamos um link de confirmação para o seu e-mail. Por favor, acesse sua caixa de entrada e clique no link para ativar sua conta.
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
        <h2 className="text-xl font-semibold tracking-tight">Criar sua conta</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Comece a transformar sua vida financeira hoje mesmo.
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
          <Label htmlFor="fullName">Nome Completo</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Ex.: Ana Silva"
            autoComplete="name"
            disabled={isSubmitting}
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>

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

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo de 6 caracteres"
            autoComplete="new-password"
            disabled={isSubmitting}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita sua senha"
            autoComplete="new-password"
            disabled={isSubmitting}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar Conta'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Já possui uma conta?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Acesse aqui
        </Link>
      </div>
    </div>
  )
}

