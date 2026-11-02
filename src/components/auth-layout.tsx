import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { TrendingUp } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

export function AuthLayout() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center p-4 sm:p-8 bg-background">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs">
            <TrendingUp className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FinanceFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão financeira pessoal e patrimonial inteligente
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-lg">
          <Outlet />
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          FinanceFlow &copy; {CURRENT_YEAR} &middot; Seus dados protegidos com criptografia de ponta.
        </footer>
      </div>
    </div>
  )
}
