import { useState, useEffect, useMemo, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  transactionSchema,
  expenseClassifications,
  type TransactionFormData,
} from '@/lib/validations/transaction'
import { formatFileSize } from '@/lib/validations/attachment'
import {
  uploadReceiptAttachment,
  createReceiptSignedUrl,
  removeReceiptAttachment,
} from '@/services/attachments'
import { useTransactions, type TransactionWithDetails } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { getTodayDateString } from '@/lib/date'
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
import {
  AlertCircle,
  Loader2,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Sparkles,
  Landmark,
  Tag,
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  X,
} from 'lucide-react'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionToEdit?: TransactionWithDetails | null
  initialKind?: 'income' | 'expense' | 'transfer'
  defaultAccountId?: string
  defaultDueDate?: string
}

export function TransactionDialog({
  open,
  onOpenChange,
  transactionToEdit,
  initialKind = 'expense',
  defaultAccountId,
  defaultDueDate,
}: TransactionDialogProps) {
  const { createTransaction, updateTransaction } = useTransactions()
  const { accounts, createAccount, isCreating: isCreatingAccount } = useAccounts()
  const {
    categories,
    isLoading: isLoadingCategories,
    categoryTree,
    createCategory,
    isCreating: isCreatingCategory,
    seedDefaultCategories,
    isSeeding,
  } = useCategories()

  const [serverError, setServerError] = useState<string | null>(null)
  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [quickCategoryName, setQuickCategoryName] = useState('')
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [isOpeningAttachment, setIsOpeningAttachment] = useState(false)
  const [newlyUploadedPath, setNewlyUploadedPath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const autoSeededRef = useRef(false)

  const isEditing = !!transactionToEdit
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  )

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      kind: initialKind,
      description: '',
      amount: 0,
      account_id: defaultAccountId || (activeAccounts[0]?.id ?? ''),
      to_account_id: null,
      category_id: null,
      expense_classification: 'variable',
      status: 'completed',
      due_date: defaultDueDate || getTodayDateString(),
      paid_date: defaultDueDate || getTodayDateString(),
      notes: '',
      attachment: null,
    },
  })

  const selectedKind = useWatch({ control, name: 'kind', defaultValue: initialKind })
  const selectedStatus = useWatch({ control, name: 'status', defaultValue: 'completed' })
  const selectedAccountId = useWatch({ control, name: 'account_id' })
  const selectedToAccountId = useWatch({ control, name: 'to_account_id' })
  const selectedCategoryId = useWatch({ control, name: 'category_id' })
  const selectedAttachment = useWatch({ control, name: 'attachment' })
  const selectedClassification = useWatch({
    control,
    name: 'expense_classification',
    defaultValue: 'variable',
  })

  // Hierarquia de categorias filtrada pelo tipo atual (income ou expense)
  const currentCategoryTree = useMemo(
    () => categoryTree(selectedKind === 'income' ? 'income' : 'expense'),
    [categoryTree, selectedKind]
  )

  // Reseta o formulário APENAS quando o modal abre ou o registro em edição muda
  useEffect(() => {
    if (!open) return

    setServerError(null)
    setShowQuickCategory(false)
    setQuickCategoryName('')
    setNewlyUploadedPath(null)

    if (transactionToEdit) {
      reset({
        kind: (
          transactionToEdit.kind === 'transfer' ? 'transfer' : transactionToEdit.kind
        ) as 'income' | 'expense' | 'transfer',
        description: transactionToEdit.description,
        amount: Number(transactionToEdit.amount),
        account_id: transactionToEdit.account_id || '',
        to_account_id: transactionToEdit.to_account_id,
        category_id: transactionToEdit.category_id,
        expense_classification: transactionToEdit.expense_classification || 'variable',
        status: transactionToEdit.status === 'canceled' ? 'pending' : transactionToEdit.status,
        due_date: transactionToEdit.due_date,
        paid_date: transactionToEdit.paid_date || transactionToEdit.due_date,
        notes: transactionToEdit.notes || '',
        attachment: transactionToEdit.attachment || null,
      })
    } else {
      const targetDate = defaultDueDate || getTodayDateString()
      const today = getTodayDateString()
      const isFutureDate = targetDate > today
      reset({
        kind: initialKind,
        description: '',
        amount: 0,
        account_id: defaultAccountId || (activeAccounts[0]?.id ?? ''),
        to_account_id: null,
        category_id: null,
        expense_classification: initialKind === 'expense' ? 'variable' : null,
        status: isFutureDate ? 'pending' : 'completed',
        due_date: targetDate,
        paid_date: isFutureDate ? null : targetDate,
        notes: '',
        attachment: null,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transactionToEdit, initialKind, defaultAccountId, defaultDueDate, reset])

  // Se as contas terminarem de carregar depois que o modal abriu e account_id estiver vazio, preenche automaticamente
  useEffect(() => {
    if (!open) return
    const currentAcc = getValues('account_id')
    if (!currentAcc && activeAccounts.length > 0) {
      setValue('account_id', defaultAccountId || activeAccounts[0].id, {
        shouldValidate: true,
      })
    }
  }, [open, activeAccounts, defaultAccountId, getValues, setValue])

  // Auto-inicializa categorias padrão na primeira vez caso o banco do usuário não tenha nenhuma categoria
  useEffect(() => {
    if (
      open &&
      !isLoadingCategories &&
      categories.length === 0 &&
      !isSeeding &&
      !autoSeededRef.current
    ) {
      autoSeededRef.current = true
      seedDefaultCategories().catch(() => {
        // Silencioso; o usuário ainda pode clicar no botão manual se desejar
      })
    }
  }, [open, isLoadingCategories, categories.length, isSeeding, seedDefaultCategories])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (newlyUploadedPath) {
        removeReceiptAttachment(newlyUploadedPath).catch(() => {})
        setNewlyUploadedPath(null)
      }
      setServerError(null)
      setShowQuickCategory(false)
    }
    onOpenChange(nextOpen)
  }

  async function handleQuickCreateAccount() {
    setServerError(null)
    try {
      const created = await createAccount({
        name: 'Conta Principal',
        institution: 'Banco Principal',
        type: 'checking',
        opening_balance: 0,
        color: '#10b981',
      })
      setValue('account_id', created.id, { shouldValidate: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta padrão'
      setServerError(msg)
    }
  }

  async function handleQuickCreateCategory() {
    const trimmed = quickCategoryName.trim()
    if (!trimmed) return
    setServerError(null)
    try {
      const targetKind = selectedKind === 'income' ? 'income' : 'expense'
      const created = await createCategory({
        name: trimmed,
        kind: targetKind,
        parent_id: null,
        color: targetKind === 'income' ? '#10b981' : '#f59e0b',
        icon: 'Tag',
      })
      setValue('category_id', created.id, { shouldValidate: true })
      setQuickCategoryName('')
      setShowQuickCategory(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar categoria'
      setServerError(msg)
    }
  }

  async function handleSeedCategories() {
    setServerError(null)
    try {
      await seedDefaultCategories()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar categorias padrão'
      setServerError(msg)
    }
  }

  async function handleAttachmentFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setServerError(null)
    setIsUploadingAttachment(true)
    try {
      const uploaded = await uploadReceiptAttachment(file)
      if (newlyUploadedPath && newlyUploadedPath !== uploaded.path) {
        removeReceiptAttachment(newlyUploadedPath).catch(() => {})
      }
      setNewlyUploadedPath(uploaded.path)
      setValue('attachment', uploaded, { shouldDirty: true, shouldValidate: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao anexar comprovante'
      setServerError(msg)
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  async function handlePreviewAttachment() {
    if (!selectedAttachment?.path) return
    setServerError(null)
    setIsOpeningAttachment(true)
    try {
      const signedUrl = await createReceiptSignedUrl(selectedAttachment.path)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao abrir comprovante'
      setServerError(msg)
    } finally {
      setIsOpeningAttachment(false)
    }
  }

  function handleRemoveAttachment() {
    if (newlyUploadedPath && selectedAttachment?.path === newlyUploadedPath) {
      removeReceiptAttachment(newlyUploadedPath).catch(() => {})
      setNewlyUploadedPath(null)
    }
    setValue('attachment', null, { shouldDirty: true, shouldValidate: true })
  }

  async function onSubmit(data: TransactionFormData) {
    setServerError(null)
    try {
      const previousPath = transactionToEdit?.attachment?.path
      if (isEditing && transactionToEdit) {
        await updateTransaction({
          id: transactionToEdit.id,
          data,
        })
        if (previousPath && previousPath !== data.attachment?.path) {
          removeReceiptAttachment(previousPath).catch(() => {})
        }
      } else {
        await createTransaction(data)
      }
      setNewlyUploadedPath(null)
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar lançamento'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados da movimentação financeira.'
              : 'Registre uma despesa, receita (entrada) ou transferência entre suas contas.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Seletor de Tipo (Despesa / Receita / Transferência) */}
          {!isEditing && (
            <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Tipo de lançamento">
              <button
                type="button"
                role="tab"
                aria-selected={selectedKind === 'expense'}
                disabled={isSubmitting}
                onClick={() => {
                  setValue('kind', 'expense', { shouldDirty: true })
                  setValue('to_account_id', null)
                  setValue('category_id', null)
                  setValue('expense_classification', 'variable')
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedKind === 'expense'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-500 shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowUpRight className="size-4" />
                Despesa
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={selectedKind === 'income'}
                disabled={isSubmitting}
                onClick={() => {
                  setValue('kind', 'income', { shouldDirty: true })
                  setValue('to_account_id', null)
                  setValue('category_id', null)
                  setValue('expense_classification', null)
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedKind === 'income'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowDownLeft className="size-4" />
                Receita
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={selectedKind === 'transfer'}
                disabled={isSubmitting}
                onClick={() => {
                  setValue('kind', 'transfer', { shouldDirty: true })
                  setValue('category_id', null)
                  setValue('expense_classification', null)
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedKind === 'transfer'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowRightLeft className="size-4" />
                Transferência
              </button>
            </div>
          )}

          {/* Alerta de criação rápida caso o usuário ainda não tenha nenhuma conta cadastrada */}
          {activeAccounts.length === 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Landmark className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Nenhuma conta bancária ativa encontrada
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Para registrar uma entrada ou saída, vincule-a a uma conta ou carteira.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isCreatingAccount}
                onClick={handleQuickCreateAccount}
                className="w-full text-xs h-8 border-amber-500/40 hover:bg-amber-500/20"
              >
                {isCreatingAccount ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5 mr-1.5" />
                )}
                Criar &ldquo;Conta Principal&rdquo; Agora (1 Clique)
              </Button>
            </div>
          )}

          {/* Valor (R$) e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Valor (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  className="pl-10 text-base font-bold tabular"
                  disabled={isSubmitting}
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-date">
                {selectedKind === 'income' ? 'Data de Recebimento' : 'Data de Vencimento'} *
              </Label>
              <Input
                id="tx-date"
                type="date"
                disabled={isSubmitting}
                {...register('due_date')}
              />
              {errors.due_date && (
                <p className="text-xs text-destructive">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-description">Descrição *</Label>
            <Input
              id="tx-description"
              placeholder={
                selectedKind === 'transfer'
                  ? 'Ex.: Transferência Nubank para Reserva'
                  : selectedKind === 'income'
                  ? 'Ex.: Salário Mensal, Freelance, Dividendos...'
                  : 'Ex.: Supermercado, Aluguel, Conta de Luz...'
              }
              disabled={isSubmitting}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Classificação / Tipo de Gasto (somente para Despesas) */}
          {selectedKind === 'expense' && (
            <div className="space-y-1.5">
              <Label>Tipo / Classificação de Gasto</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {expenseClassifications.map((item) => {
                  const isActive = (selectedClassification || 'variable') === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={isSubmitting}
                      title={item.description}
                      onClick={() =>
                        setValue('expense_classification', item.value, {
                          shouldDirty: true,
                        })
                      }
                      className={`flex flex-col items-center justify-center rounded-lg border px-2.5 py-2 text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary font-semibold shadow-2xs'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {
                  expenseClassifications.find(
                    (c) => c.value === (selectedClassification || 'variable')
                  )?.description
                }
              </p>
            </div>
          )}

          {/* Configuração de Contas e Categorias */}
          {selectedKind === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tx-from-account">Conta de Origem (Saída) *</Label>
                <select
                  id="tx-from-account"
                  disabled={isSubmitting}
                  value={selectedAccountId || ''}
                  onChange={(e) =>
                    setValue('account_id', e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled className="bg-popover text-popover-foreground">
                    Selecione a conta
                  </option>
                  {activeAccounts.map((acc) => (
                    <option
                      key={acc.id}
                      value={acc.id}
                      className="bg-popover text-popover-foreground"
                    >
                      {acc.name}
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="text-xs text-destructive">{errors.account_id.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-to-account">Conta de Destino (Entrada) *</Label>
                <select
                  id="tx-to-account"
                  disabled={isSubmitting}
                  value={selectedToAccountId || ''}
                  onChange={(e) =>
                    setValue('to_account_id', e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled className="bg-popover text-popover-foreground">
                    Selecione a conta
                  </option>
                  {activeAccounts
                    .filter((acc) => acc.id !== selectedAccountId)
                    .map((acc) => (
                      <option
                        key={acc.id}
                        value={acc.id}
                        className="bg-popover text-popover-foreground"
                      >
                        {acc.name}
                      </option>
                    ))}
                </select>
                {errors.to_account_id && (
                  <p className="text-xs text-destructive">{errors.to_account_id.message}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tx-account">
                  {selectedKind === 'income' ? 'Conta de Destino *' : 'Conta de Pagamento *'}
                </Label>
                <select
                  id="tx-account"
                  disabled={isSubmitting}
                  value={selectedAccountId || ''}
                  onChange={(e) =>
                    setValue('account_id', e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled className="bg-popover text-popover-foreground">
                    Selecione a conta
                  </option>
                  {activeAccounts.map((acc) => (
                    <option
                      key={acc.id}
                      value={acc.id}
                      className="bg-popover text-popover-foreground"
                    >
                      {acc.name}
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="text-xs text-destructive">{errors.account_id.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tx-category">
                    {selectedKind === 'income' ? 'Categoria de Receita' : 'Categoria de Gasto'}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCategory((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Plus className="size-3" />
                    {showQuickCategory ? 'Fechar' : 'Nova categoria'}
                  </button>
                </div>

                <select
                  id="tx-category"
                  disabled={isSubmitting || isSeeding}
                  value={selectedCategoryId || ''}
                  onChange={(e) =>
                    setValue('category_id', e.target.value || null, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" className="bg-popover text-popover-foreground">
                    {isSeeding ? 'Carregando categorias...' : 'Selecione uma categoria'}
                  </option>
                  {currentCategoryTree.map((parent) => (
                    <optgroup
                      key={parent.id}
                      label={parent.name}
                      className="bg-popover text-popover-foreground font-semibold"
                    >
                      <option
                        value={parent.id}
                        className="bg-popover text-popover-foreground font-normal"
                      >
                        {parent.name} (Geral)
                      </option>
                      {(parent.children || []).map((sub) => (
                        <option
                          key={sub.id}
                          value={sub.id}
                          className="bg-popover text-popover-foreground font-normal"
                        >
                          &nbsp;&nbsp;↳ {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Botão rápido se não houver categorias carregadas */}
                {currentCategoryTree.length === 0 && !isSeeding && (
                  <button
                    type="button"
                    onClick={handleSeedCategories}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline pt-0.5 cursor-pointer"
                  >
                    <Sparkles className="size-3" />
                    Carregar categorias padrão de {selectedKind === 'income' ? 'Receitas' : 'Despesas'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Criação rápida inline de categoria */}
          {showQuickCategory && selectedKind !== 'transfer' && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2 animate-in fade-in-50 duration-150">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Tag className="size-3.5" />
                <span>
                  Criar nova categoria de{' '}
                  {selectedKind === 'income' ? 'Receita (Entrada)' : 'Despesa (Saída)'}
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={quickCategoryName}
                  onChange={(e) => setQuickCategoryName(e.target.value)}
                  placeholder={
                    selectedKind === 'income'
                      ? 'Ex.: Salário, Consultoria, Aluguel Recebido...'
                      : 'Ex.: Supermercado, Saúde, Assinaturas...'
                  }
                  className="h-8 text-xs bg-background"
                  disabled={isCreatingCategory}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  disabled={isCreatingCategory || !quickCategoryName.trim()}
                  onClick={handleQuickCreateCategory}
                >
                  {isCreatingCategory ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    'Adicionar'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Status (Efetivado vs Pendente) */}
          <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/20">
            <div>
              <Label className="text-sm font-medium">
                {selectedKind === 'income'
                  ? 'Já foi recebido?'
                  : selectedKind === 'transfer'
                  ? 'Transferência já efetivada?'
                  : 'Já foi pago?'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {selectedStatus === 'completed'
                  ? 'Movimenta o saldo atual da conta imediatamente.'
                  : 'Fica agendado como pendente (compõe o saldo previsto).'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={selectedStatus === 'completed'}
              disabled={isSubmitting}
              onClick={() => {
                const nextStatus = selectedStatus === 'completed' ? 'pending' : 'completed'
                setValue('status', nextStatus, { shouldDirty: true })
                if (nextStatus === 'completed') {
                  setValue('paid_date', getTodayDateString())
                } else {
                  setValue('paid_date', null)
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                selectedStatus === 'completed' ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                  selectedStatus === 'completed' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Observações (Opcional)</Label>
            <Input
              id="tx-notes"
              placeholder="Notas adicionais sobre o lançamento..."
              disabled={isSubmitting}
              {...register('notes')}
            />
          </div>

          {/* Comprovante / Recibo (Opcional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="size-3.5 text-primary" />
                Comprovante ou Recibo (Opcional)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                PDF, PNG, JPG ou WEBP até 5 MB
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={handleAttachmentFileSelect}
              className="hidden"
            />

            {selectedAttachment ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    {selectedAttachment.mime === 'application/pdf' ? (
                      <FileText className="size-4" />
                    ) : (
                      <ImageIcon className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {selectedAttachment.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular">
                      {formatFileSize(selectedAttachment.size)} &middot; Arquivo protegido
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isOpeningAttachment || isSubmitting}
                    onClick={handlePreviewAttachment}
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    {isOpeningAttachment ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <ExternalLink className="size-3" />
                    )}
                    Abrir
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isSubmitting}
                    onClick={handleRemoveAttachment}
                    className="size-7 text-muted-foreground hover:text-destructive"
                    title="Remover comprovante"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingAttachment || isSubmitting}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 border-dashed text-xs font-medium text-muted-foreground hover:text-foreground gap-2"
              >
                {isUploadingAttachment ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Enviando comprovante com segurança...
                  </>
                ) : (
                  <>
                    <Upload className="size-4 text-primary" />
                    Clique para anexar nota fiscal, boleto ou comprovante
                  </>
                )}
              </Button>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isUploadingAttachment}
              onClick={() => handleDialogChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploadingAttachment}>
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEditing
                ? 'Salvar Alterações'
                : selectedKind === 'income'
                ? 'Confirmar Entrada'
                : selectedKind === 'transfer'
                ? 'Confirmar Transferência'
                : 'Confirmar Despesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
