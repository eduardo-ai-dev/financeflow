import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getModuleByPath } from '@/config/modules'
import { useAuth } from '@/hooks/use-auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { TransactionDialog } from '@/components/transaction-dialog'
import { Button } from '@/components/ui/button'
import { Menu, LogOut, Plus } from 'lucide-react'

interface HeaderProps {
  onOpenMobileSidebar: () => void
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const activeModule = getModuleByPath(location.pathname)

  const userInitial = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left side: Hamburger button + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="lg:hidden"
          aria-label="Abrir menu lateral"
        >
          <Menu className="size-5" />
        </Button>

        {activeModule && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              FinanceFlow
            </span>
            <span className="text-muted-foreground hidden sm:inline">&middot;</span>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              {activeModule.title}
            </h1>
          </div>
        )}
      </div>

      {/* Right side: Quick launch, Theme toggle, Profile avatar & Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Button
          size="sm"
          onClick={() => setTransactionDialogOpen(true)}
          className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Novo Lançamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>

        <ThemeToggle />

        <div className="h-5 w-px bg-border mx-0.5 hidden sm:block" />

        {/* User preview and logout */}
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold"
            title={profile?.full_name || user?.email || undefined}
          >
            {userInitial}
          </div>

          <div className="hidden lg:flex flex-col text-left text-xs leading-none">
            <span className="font-medium text-foreground truncate max-w-[120px]">
              {profile?.full_name || 'Usuário'}
            </span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px] mt-0.5">
              {user?.email}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
      <TransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
      />
    </header>
  )
}
