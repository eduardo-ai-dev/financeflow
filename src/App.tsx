import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/components/auth-provider'
import { ProtectedRoute } from '@/components/protected-route'
import { PublicRoute } from '@/components/public-route'
import { AuthLayout } from '@/components/auth-layout'
import { AppLayout } from '@/components/app-layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

import { LoginPage } from '@/pages/auth/login-page'
import { RegisterPage } from '@/pages/auth/register-page'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page'
import { ResetPasswordPage } from '@/pages/auth/reset-password-page'

// Módulos com carregamento sob demanda
const DashboardPage = lazy(() => import('@/pages/dashboard-page'))
const ResumoPage = lazy(() => import('@/pages/resumo-page'))
const CalendarioPage = lazy(() => import('@/pages/calendario-page'))

const ContasPage = lazy(() => import('@/pages/contas-page'))
const EntradasPage = lazy(() => import('@/pages/entradas-page'))
const SaidasPage = lazy(() => import('@/pages/saidas-page'))
const CategoriasPage = lazy(() => import('@/pages/categorias-page'))
const CartoesPage = lazy(() => import('@/pages/cartoes-page'))
const ParcelamentosPage = lazy(() => import('@/pages/parcelamentos-page'))
const ContasAPagarPage = lazy(() => import('@/pages/contas-a-pagar-page'))
const RecorrenciasPage = lazy(() => import('@/pages/recorrencias-page'))
const TransferenciasPage = lazy(() => import('@/pages/transferencias-page'))

const ProjetosPage = lazy(() => import('@/pages/projetos-page'))
const ImoveisPage = lazy(() => import('@/pages/imoveis-page'))
const MetasPage = lazy(() => import('@/pages/metas-page'))
const InvestimentosPage = lazy(() => import('@/pages/investimentos-page'))
const PatrimonioPage = lazy(() => import('@/pages/patrimonio-page'))
const DividasPage = lazy(() => import('@/pages/dividas-page'))
const CofresPage = lazy(() => import('@/pages/cofres-page'))

const PlanejamentoPage = lazy(() => import('@/pages/planejamento-page'))
const SimuladoresPage = lazy(() => import('@/pages/simuladores-page'))
const RelatoriosPage = lazy(() => import('@/pages/relatorios-page'))
const NotificacoesPage = lazy(() => import('@/pages/notificacoes-page'))

const ConfiguracoesPage = lazy(() => import('@/pages/configuracoes-page'))

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rotas Públicas de Autenticação */}
            <Route element={<PublicRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>
            </Route>

            {/* Rotas Protegidas dentro do AppLayout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* 1. Visão Geral */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/resumo" element={<ResumoPage />} />
                <Route path="/calendario" element={<CalendarioPage />} />

                {/* 2. Fluxo de Caixa */}
                <Route path="/contas" element={<ContasPage />} />
                <Route path="/entradas" element={<EntradasPage />} />
                <Route path="/saidas" element={<SaidasPage />} />
                <Route path="/categorias" element={<CategoriasPage />} />
                <Route path="/cartoes" element={<CartoesPage />} />
                <Route path="/parcelamentos" element={<ParcelamentosPage />} />
                <Route path="/contas-a-pagar" element={<ContasAPagarPage />} />
                <Route path="/recorrencias" element={<RecorrenciasPage />} />
                <Route path="/transferencias" element={<TransferenciasPage />} />

                {/* 3. Patrimônio & Objetivos */}
                <Route path="/projetos" element={<ProjetosPage />} />
                <Route path="/imoveis" element={<ImoveisPage />} />
                <Route path="/metas" element={<MetasPage />} />
                <Route path="/investimentos" element={<InvestimentosPage />} />
                <Route path="/patrimonio" element={<PatrimonioPage />} />
                <Route path="/dividas" element={<DividasPage />} />
                <Route path="/cofres" element={<CofresPage />} />

                {/* 4. Estratégia & Análise */}
                <Route path="/planejamento" element={<PlanejamentoPage />} />
                <Route path="/simuladores" element={<SimuladoresPage />} />
                <Route path="/relatorios" element={<RelatoriosPage />} />
                <Route path="/notificacoes" element={<NotificacoesPage />} />

                {/* 5. Sistema */}
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              </Route>
            </Route>

            {/* Fallback para rotas desconhecidas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
