import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Settings,
  User,
  Sun,
  Moon,
  Download,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

export default function ConfiguracoesPage() {
  const { user, profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  async function handleExportFullBackup() {
    try {
      setIsExporting(true)
      setExportMessage('Coletando tabelas financeiras...')

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
        `financeflow_backup_completo_${new Date().toISOString().substring(0, 10)}.json`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportMessage('Backup exportado com sucesso!')
      setTimeout(() => setExportMessage(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar backup.'
      setExportMessage(`Falha: ${msg}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações & Soberania</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Perfil de usuário, preferências do sistema, backup integral e auditoria das regras contábeis.
        </p>
      </div>

      {/* Perfil de Usuário */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Perfil de Acesso</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="user-name">Nome Completo</Label>
            <Input id="user-name" value={profile?.full_name || 'Usuário FinanceFlow'} disabled />
          </div>
          <div>
            <Label htmlFor="user-email">E-mail da Conta</Label>
            <Input id="user-email" value={user?.email || ''} disabled />
          </div>
          <div>
            <Label htmlFor="user-currency">Moeda Padrão</Label>
            <Input id="user-currency" value="BRL (R$ Real Brasileiro)" disabled />
          </div>
          <div>
            <Label htmlFor="user-timezone">Fuso Horário Padrão</Label>
            <Input id="user-timezone" value="América/São Paulo (UTC-3)" disabled />
          </div>
        </div>
      </div>

      {/* Tema e Aparência */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Tema & Interface Visual</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Modo de Exibição</p>
            <p className="text-xs text-muted-foreground">
              Alterne entre o tema claro, escuro ou siga a preferência do sistema operacional.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
              className="gap-1.5"
            >
              <Sun className="h-4 w-4" /> Claro
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="gap-1.5"
            >
              <Moon className="h-4 w-4" /> Escuro
            </Button>
          </div>
        </div>
      </div>

      {/* Backup e Soberania Total dos Dados */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold text-base">Soberania & Backup Integral de Dados</h2>
            <p className="text-xs text-muted-foreground">
              Você é o único dono dos seus dados. Exporte um snapshot JSON completo de todas as suas contas, transações, investimentos e imóveis.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg">
          <div>
            <h4 className="font-medium text-sm">Download do Arquivo de Backup (JSON)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gera um arquivo padronizado com todas as 11 tabelas do sistema para custódia offline.
            </p>
            {exportMessage && (
              <p className="text-xs font-semibold text-primary mt-1.5">{exportMessage}</p>
            )}
          </div>

          <Button
            onClick={handleExportFullBackup}
            disabled={isExporting}
            className="gap-2 shrink-0"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Baixar Backup Completo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Checklist de Conformidade com as 7 Regras Inegociáveis */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <div>
            <h2 className="font-semibold text-base">Regras Contábeis Inegociáveis (README)</h2>
            <p className="text-xs text-muted-foreground">
              Garantias ativas no motor financeiro para integridade patrimonial permanente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            {
              num: 1,
              title: 'Separação de Caixa, Patrimônio e Objetivos',
              desc: 'Balanço Patrimonial real com Ativos menos Passivos. Conversão direta de metas em bens patrimoniais.',
            },
            {
              num: 2,
              title: 'Neutralidade Contábil de Transferências',
              desc: 'Transferir entre contas bancárias nunca afeta despesas nem receitas totais.',
            },
            {
              num: 3,
              title: 'Competência vs. Caixa nos Cartões',
              desc: 'Compras afetam o limite e a fatura; quitar fatura deduz banco sem duplicar o consumo.',
            },
            {
              num: 4,
              title: 'Aporte em Investimento NÃO é Despesa',
              desc: 'Investir é transferência de liquidez para ativo; o patrimônio líquido permanece neutro no aporte.',
            },
            {
              num: 5,
              title: 'Modo Sandbox sem Efeitos Colaterais',
              desc: 'Simulador de cenários futuros opera em memória pura, sem alterar registros reais.',
            },
            {
              num: 6,
              title: 'Amortização Extraordinária Imobiliária',
              desc: 'Cálculo exato de SAC/Price, comparando redução de prazo contra redução de parcela.',
            },
            {
              num: 7,
              title: 'Zero Dados Fictícios (No Mock Data)',
              desc: 'Todos os valores e gráficos refletem consultas reais via PostgreSQL e RLS.',
            },
          ].map((r) => (
            <div key={r.num} className="p-3 rounded-lg border bg-muted/10 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Regra {r.num}: {r.title}</span>
              </div>
              <p className="text-muted-foreground pl-5">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Encerramento de Sessão */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Encerrar Sessão
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Desconecta seu login e limpa tokens de autenticação locais deste navegador.
          </p>
        </div>
        <Button variant="destructive" onClick={() => signOut()} className="gap-2 shrink-0">
          <LogOut className="h-4 w-4" /> Sair da Conta
        </Button>
      </div>
    </div>
  )
}
