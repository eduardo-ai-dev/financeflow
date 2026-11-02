import { useState, useMemo, useRef } from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import {
  parseBankStatementCsv,
  generateSampleCsvTemplate,
  MAX_CSV_FILE_BYTES,
  type ParsedStatementRow,
  type CsvParseError,
} from '@/lib/csv-import'
import { formatBRL, toCents, fromCents, sumCents } from '@/lib/money'
import { formatDate } from '@/lib/date'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Plus,
  Trash2,
} from 'lucide-react'

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultAccountId?: string
}

export function CsvImportDialog({
  open,
  onOpenChange,
  defaultAccountId,
}: CsvImportDialogProps) {
  const { importBatch, isImportingBatch } = useTransactions()
  const { accounts, createAccount, isCreating: isCreatingAccount } = useAccounts()
  const { categories } = useCategories()

  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  )
  const incomeCategories = useMemo(
    () => categories.filter((c) => !c.is_archived && c.kind === 'income'),
    [categories]
  )
  const expenseCategories = useMemo(
    () => categories.filter((c) => !c.is_archived && c.kind === 'expense'),
    [categories]
  )

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [accountId, setAccountId] = useState<string>('')
  const [incomeCategoryId, setIncomeCategoryId] = useState<string>('')
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>('')
  const [importStatus, setImportStatus] = useState<'completed' | 'pending'>('completed')

  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedStatementRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [parseErrors, setParseErrors] = useState<CsvParseError[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  const effectiveAccountId = accountId || defaultAccountId || activeAccounts[0]?.id || ''

  function resetParsedFile() {
    setFileName(null)
    setRows([])
    setSelectedIds(new Set())
    setParseErrors([])
    setErrorMsg(null)
    setSuccessCount(null)
  }

  function handleDialogChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetParsedFile()
    }
    onOpenChange(nextOpen)
  }

  async function handleQuickCreateAccount() {
    setErrorMsg(null)
    try {
      const created = await createAccount({
        name: 'Conta Principal',
        institution: 'Banco Principal',
        type: 'checking',
        opening_balance: 0,
        color: '#10b981',
      })
      setAccountId(created.id)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar conta.')
    }
  }

  function handleDownloadTemplate() {
    const csvContent = '\uFEFF' + generateSampleCsvTemplate()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'modelo_extrato_financeflow.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setErrorMsg(null)
    setSuccessCount(null)

    if (file.size > MAX_CSV_FILE_BYTES) {
      setErrorMsg('O arquivo CSV deve ter no máximo 2 MB.')
      return
    }

    try {
      const text = await file.text()
      const result = parseBankStatementCsv(text)
      setFileName(file.name)
      setRows(result.rows)
      setSelectedIds(new Set(result.rows.map((r) => r.id)))
      setParseErrors(result.errors)

      if (result.rows.length === 0) {
        setErrorMsg(
          result.errors[0]?.reason ||
            'Nenhum lançamento válido foi encontrado neste arquivo CSV.'
        )
      }
    } catch {
      setErrorMsg('Não foi possível ler o arquivo selecionado. Verifique a formatação CSV.')
    }
  }

  function toggleRowSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAllRows() {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)))
    }
  }

  function toggleRowKind(id: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, kind: r.kind === 'income' ? 'expense' : 'income' }
          : r
      )
    )
  }

  const selectedSummary = useMemo(() => {
    let count = 0
    let incCents = 0
    let expCents = 0

    for (const r of rows) {
      if (!selectedIds.has(r.id)) continue
      count += 1
      if (r.kind === 'income') {
        incCents = sumCents(incCents, toCents(r.amount))
      } else {
        expCents = sumCents(expCents, toCents(r.amount))
      }
    }

    return {
      count,
      incomeTotal: fromCents(incCents),
      expenseTotal: fromCents(expCents),
    }
  }, [rows, selectedIds])

  async function handleConfirmImport() {
    if (!effectiveAccountId) {
      setErrorMsg('Selecione a conta bancária onde o extrato será importado.')
      return
    }

    const toImport = rows.filter((r) => selectedIds.has(r.id))
    if (toImport.length === 0) {
      setErrorMsg('Selecione ao menos um lançamento da tabela para importar.')
      return
    }

    setErrorMsg(null)
    try {
      const count = await importBatch(
        toImport.map((r) => ({
          kind: r.kind,
          status: importStatus,
          description: r.description,
          amount: r.amount,
          account_id: effectiveAccountId,
          category_id:
            r.kind === 'income'
              ? incomeCategoryId || null
              : expenseCategoryId || null,
          expense_classification: r.kind === 'expense' ? 'variable' : null,
          due_date: r.due_date,
          paid_date: importStatus === 'completed' ? r.due_date : null,
          notes: r.notes || null,
        }))
      )

      setSuccessCount(count)
      setTimeout(() => {
        handleDialogChange(false)
      }, 1200)
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao importar os lançamentos.'
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Importar Extrato Bancário (CSV)
            </DialogTitle>
            <DialogDescription>
              Envie o extrato exportado pelo seu banco, revise as movimentações identificadas e importe em lote com 1 clique.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 py-4 space-y-5">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Atenção na importação</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {successCount !== null && (
            <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <AlertTitle>Extrato importado com sucesso!</AlertTitle>
              <AlertDescription>
                {successCount}{' '}
                {successCount === 1
                  ? 'movimentação foi adicionada'
                  : 'movimentações foram adicionadas'}{' '}
                à sua conta.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta se não houver contas */}
          {activeAccounts.length === 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Landmark className="size-4 text-amber-500 shrink-0" />
                <span className="text-xs font-medium text-foreground">
                  Você precisa de uma conta bancária cadastrada para vincular o extrato.
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isCreatingAccount}
                onClick={handleQuickCreateAccount}
                className="text-xs h-8 shrink-0"
              >
                {isCreatingAccount ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5 mr-1.5" />
                )}
                Criar Conta Principal
              </Button>
            </div>
          )}

          {/* Configuração de Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="csv-account">Conta Bancária de Destino *</Label>
              <select
                id="csv-account"
                value={effectiveAccountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={isImportingBatch}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Selecione a conta
                </option>
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csv-status">Situação dos Lançamentos</Label>
              <select
                id="csv-status"
                value={importStatus}
                onChange={(e) =>
                  setImportStatus(e.target.value as 'completed' | 'pending')
                }
                disabled={isImportingBatch}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="completed">Já efetivados (movimenta saldo atual)</option>
                <option value="pending">Pendentes / Agendados (compõe saldo previsto)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csv-inc-cat">Categoria Padrão p/ Receitas (Opcional)</Label>
              <select
                id="csv-inc-cat"
                value={incomeCategoryId}
                onChange={(e) => setIncomeCategoryId(e.target.value)}
                disabled={isImportingBatch}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sem categoria padrão</option>
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csv-exp-cat">Categoria Padrão p/ Despesas (Opcional)</Label>
              <select
                id="csv-exp-cat"
                value={expenseCategoryId}
                onChange={(e) => setExpenseCategoryId(e.target.value)}
                disabled={isImportingBatch}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sem categoria padrão</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Área de Seleção de Arquivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          {rows.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-muted/15 p-8 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Selecione um arquivo CSV do seu banco ou planilha
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Reconhecemos automaticamente separadores (ponto e vírgula ou vírgula), datas brasileiras (DD/MM/AAAA) e valores positivos ou negativos.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs gap-1.5"
                >
                  <Upload className="size-3.5" />
                  Escolher Arquivo CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="text-xs gap-1.5"
                >
                  <Download className="size-3.5" />
                  Baixar Modelo Exemplo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Resumo do Arquivo Lido */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/25 px-3.5 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="size-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold truncate">{fileName}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedSummary.count} de {rows.length} selecionados
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs tabular">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    + {formatBRL(selectedSummary.incomeTotal)}
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    &minus; {formatBRL(selectedSummary.expenseTotal)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetParsedFile}
                    disabled={isImportingBatch}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Trocar arquivo
                  </Button>
                </div>
              </div>

              {parseErrors.length > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Nota: {parseErrors.length}{' '}
                  {parseErrors.length === 1
                    ? 'linha foi ignorada'
                    : 'linhas foram ignoradas'}{' '}
                  por formatação incompleta ou transferência neutra.
                </p>
              )}

              {/* Tabela de Pré-Visualização */}
              <div className="rounded-xl border overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === rows.length && rows.length > 0}
                          onChange={toggleAllRows}
                          className="rounded border-input accent-primary cursor-pointer"
                          aria-label="Selecionar todos"
                        />
                      </th>
                      <th className="py-2 px-3 font-semibold text-muted-foreground">Data</th>
                      <th className="py-2 px-3 font-semibold text-muted-foreground">Descrição</th>
                      <th className="py-2 px-3 font-semibold text-muted-foreground">Tipo</th>
                      <th className="py-2 px-3 font-semibold text-muted-foreground text-right">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => {
                      const isChecked = selectedIds.has(row.id)
                      const isIncome = row.kind === 'income'
                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            isChecked ? 'bg-card hover:bg-muted/20' : 'opacity-45 bg-muted/10'
                          }`}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRowSelection(row.id)}
                              className="rounded border-input accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 tabular whitespace-nowrap text-muted-foreground">
                            {formatDate(row.due_date)}
                          </td>
                          <td className="py-2 px-3 font-medium text-foreground max-w-[220px] truncate">
                            {row.description}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleRowKind(row.id)}
                              title="Clique para alternar entre Receita e Despesa"
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border cursor-pointer ${
                                isIncome
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isIncome ? (
                                <>
                                  <ArrowDownLeft className="size-2.5" />
                                  Receita
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="size-2.5" />
                                  Despesa
                                </>
                              )}
                            </button>
                          </td>
                          <td
                            className={`py-2 px-3 text-right tabular font-bold whitespace-nowrap ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? '+ ' : '- '}
                            {formatBRL(row.amount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-3 border-t gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isImportingBatch}
            onClick={() => handleDialogChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isImportingBatch || selectedSummary.count === 0 || !effectiveAccountId}
            onClick={handleConfirmImport}
          >
            {isImportingBatch && <Loader2 className="size-4 mr-2 animate-spin" />}
            Importar {selectedSummary.count > 0 ? `${selectedSummary.count} ` : ''}
            {selectedSummary.count === 1 ? 'Lançamento' : 'Lançamentos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
