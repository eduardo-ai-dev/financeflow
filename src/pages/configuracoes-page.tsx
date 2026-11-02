import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { supabase } from '@/lib/supabase'
import { getTodayDateString } from '@/lib/date'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Settings,
  User,
  Sun,
  Moon,
  Download,
  Upload,
  LogOut,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

export default function ConfiguracoesPage() {
  const { user, profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [csvImportOpen, setCsvImportOpen] = useState(false)

  async function handleExportFullBackup() {
    try {
      setIsExporting(true)
      setExportMessage('Preparando seus dados financeiros...')

      const [
        accounts,
        categories,
        transactions,
        cards,
        projects,
        properties,
        amortizations,
        goals,
        assets,
        investments,
        liabilities,
      ] = await Promise.all([
        supabase.from('accounts').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('credit_cards').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('real_estate_properties').select('*'),
        supabase.from('real_estate_amortizations').select('*'),
        supabase.from('goals').select('*'),
        supabase.from('assets').select('*'),
        supabase.from('investments').select('*'),
        supabase.from('liabilities').select('*'),
      ])

      const backupData = {
        exported_at: new Date().toISOString(),
        version: '1.0.0',
        user_id: user?.id,
        user_email: user?.email,
        profile: profile,
        data: {
          accounts: accounts.data || [],
          categories: categories.data || [],
          transactions: transactions.data || [],
          credit_cards: cards.data || [],
          projects: projects.data || [],
          real_estate_properties: properties.data || [],
          real_estate_amortizations: amortizations.data || [],
          goals: goals.data || [],
          assets: assets.data || [],
          investments: investments.data || [],
          liabilities: liabilities.data || [],
        },
      }

      const jsonStr = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `financeflow_historico_completo_${getTodayDateString()}.json`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportMessage('Histórico exportado com sucesso!')
      setTimeout(() => setExportMessage(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao exportar dados.'
      setExportMessage(`Falha: ${msg}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="pb-2 border-b">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie seu perfil de acesso, preferências visuais e exportação dos seus dados.
        </p>
      </div>

      {/* Perfil de Usuário */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          <User className="size-5 text-primary" />
          <h2 className="font-semibold text-base">Meus Dados</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Nome Completo</Label>
            <Input id="user-name" value={profile?.full_name || 'Cliente FinanceFlow'} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-email">E-mail de Acesso</Label>
            <Input id="user-email" value={user?.email || ''} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-currency">Moeda Principal</Label>
            <Input id="user-currency" value="BRL (R$ Real Brasileiro)" disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-timezone">Fuso Horário</Label>
            <Input id="user-timezone" value="América/São Paulo (UTC-3)" disabled />
          </div>
        </div>
      </div>

      {/* Tema e Aparência */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          <Settings className="size-5 text-primary" />
          <h2 className="font-semibold text-base">Aparência</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Modo de Exibição</p>
            <p className="text-xs text-muted-foreground">
              Alterne entre o tema claro ou escuro com contraste otimizado para leitura financeira.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
              className="gap-1.5 text-xs"
            >
              <Sun className="size-4" /> Claro
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="gap-1.5 text-xs"
            >
              <Moon className="size-4" /> Escuro
            </Button>
          </div>
        </div>
      </div>

      {/* Exportação de Dados */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          <Download className="size-5 text-primary" />
          <div>
            <h2 className="font-semibold text-base">Portabilidade & Cópia de Segurança</h2>
            <p className="text-xs text-muted-foreground">
              Baixe a qualquer momento uma cópia completa de todas as suas contas, lançamentos, cartões, metas e investimentos.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl">
          <div>
            <h4 className="font-medium text-sm">Exportar Histórico Completo</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Salva em seu dispositivo um arquivo completo com todas as suas movimentações e patrimônio.
            </p>
            {exportMessage && (
              <p className="text-xs font-semibold text-primary mt-1.5">{exportMessage}</p>
            )}
          </div>

          <Button
            onClick={handleExportFullBackup}
            disabled={isExporting}
            size="sm"
            className="gap-2 shrink-0 text-xs"
          >
            {isExporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="size-4" /> Baixar Meus Dados
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl">
          <div>
            <h4 className="font-medium text-sm">Importar Extrato Bancário (CSV)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Carregue planilhas ou extratos bancários em formato CSV para registrar movimentações em lote.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvImportOpen(true)}
            className="gap-2 shrink-0 text-xs"
          >
            <Upload className="size-4 text-primary" /> Importar Extrato CSV
          </Button>
        </div>
      </div>

      {/* Encerramento de Sessão */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4" /> Encerrar Sessão
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Desconecta sua conta com segurança neste dispositivo.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => signOut()}
          className="gap-2 shrink-0 text-xs"
        >
          <LogOut className="size-4" /> Sair da Conta
        </Button>
      </div>

      <CsvImportDialog open={csvImportOpen} onOpenChange={setCsvImportOpen} />
    </div>
  )
}
