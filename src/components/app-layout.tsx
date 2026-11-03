import { useState, useEffect, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { MobileQuickAction } from '@/components/mobile-quick-action'
import { Loader2 } from 'lucide-react'

const SIDEBAR_STORAGE_KEY = 'financeflow-sidebar-collapsed'

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs font-medium">Carregando módulo...</span>
      </div>
    </div>
  )
}

export function AppLayout() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed))
    } catch {
      // Ignora erro se localStorage indisponível
    }
  }, [isCollapsed])

  // Garante que ao navegar entre rotas nenhum bloqueio residual de pointer-events permaneça no body
  useEffect(() => {
    if (document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = ''
    }
  }, [location.pathname])

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Sidebar navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex min-h-svh flex-col transition-all duration-200 ease-in-out ${
          isCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'
        }`}
      >
        <Header onOpenMobileSidebar={() => setIsMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <RouteErrorBoundary key={location.pathname}>
            <Suspense key={location.pathname} fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>

        <MobileQuickAction />
      </div>
    </div>
  )
}
