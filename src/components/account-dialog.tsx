import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  accountSchema,
  accountTypes,
  accountColors,
  type AccountFormData,
} from '@/lib/validations/account'
import { useAccounts } from '@/hooks/use-accounts'
import type { AccountWithBalance } from '@/services/accounts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-react'

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountToEdit?: AccountWithBalance | null
}

export function AccountDialog({
  open,
  onOpenChange,
  accountToEdit,
}: AccountDialogProps) {
  const { createAccount, updateAccount } = useAccounts()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!accountToEdit

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      institution: '',
      type: 'digital',
      opening_balance: 0,
      color: '#10b981',
    },
  })

  const selectedColor = useWatch({ control, name: 'color', defaultValue: '#10b981' })
  const selectedType = useWatch({ control, name: 'type', defaultValue: 'digital' })

  useEffect(() => {
    if (accountToEdit) {
      reset({
        name: accountToEdit.name,
        institution: accountToEdit.institution || '',
        type: accountToEdit.type,
        opening_balance: Number(accountToEdit.opening_balance),
        color: accountToEdit.color || '#10b981',
      })
    } else {
      reset({
        name: '',
        institution: '',
        type: 'digital',
        opening_balance: 0,
        color: '#10b981',
      })
    }
  }, [accountToEdit, reset, open])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(data: AccountFormData) {
    setServerError(null)
    try {
      if (isEditing && accountToEdit) {
        await updateAccount({
          id: accountToEdit.id,
          data: {
            name: data.name,
            institution: data.institution,
            type: data.type,
            color: data.color,
          },
        })
      } else {
        await createAccount(data)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar conta'
      if (msg.includes('accounts_user_name_key')) {
        setServerError('Você já possui uma conta com este nome.')
      } else {
        setServerError(msg)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Conta' : 'Nova Conta Financeira'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere as informações da sua conta financeira.'
              : 'Cadastre sua conta bancária, carteira digital, espécie ou reserva.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Nome da Conta */}
          <div className="space-y-1.5">
            <Label htmlFor="account-name">Nome da Conta *</Label>
            <Input
              id="account-name"
              placeholder="Ex.: Nubank Principal, Carteira, Reserva"
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Instituição */}
          <div className="space-y-1.5">
            <Label htmlFor="institution">Instituição Financeira</Label>
            <Input
              id="institution"
              placeholder="Ex.: Nubank, Itaú, Inter, Espécie"
              disabled={isSubmitting}
              {...register('institution')}
            />
            {errors.institution && (
              <p className="text-xs text-destructive">{errors.institution.message}</p>
            )}
          </div>

          {/* Tipo de Conta */}
          <div className="space-y-1.5">
            <Label htmlFor="account-type">Tipo de Conta *</Label>
            <select
              id="account-type"
              value={selectedType}
              onChange={(e) => setValue('type', e.target.value as AccountFormData['type'])}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {accountTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Saldo Inicial (apenas na criação) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="opening-balance">Saldo Inicial (R$)</Label>
              <Input
                id="opening-balance"
                type="number"
                step="0.01"
                placeholder="0,00"
                disabled={isSubmitting}
                {...register('opening_balance', { valueAsNumber: true })}
              />
              <p className="text-[11px] text-muted-foreground">
                O saldo atual é calculado a partir deste valor somado às suas movimentações reais.
              </p>
              {errors.opening_balance && (
                <p className="text-xs text-destructive">{errors.opening_balance.message}</p>
              )}
            </div>
          )}

          {/* Cor Identificadora */}
          <div className="space-y-1.5">
            <Label>Cor Identificadora</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {accountColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedColor === color ? 'border-primary ring-2 ring-primary/40 scale-105' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                'Salvar Alterações'
              ) : (
                'Criar Conta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
