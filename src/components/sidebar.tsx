import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MODULE_GROUPS } from '@/config/modules'
import { TrendingUp, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

const STORAGE_KEY = 'financeflow:sidebar:open-groups:v1'

function getInitialOpenGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // Fallback silencioso
  }
  // Por padrão, todos os grupos começam abertos
  return MODULE_GROUPS.reduce<Record<string, boolean>>((acc, g) => {
    acc[g.id] = true
    return acc
  }, {})
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups)

  const [prevPath, setPrevPath] = useState(location.pathname)

  // Garante que o grupo da rota atual esteja expandido ao navegar
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    const currentPath = location.pathname
    const activeGroup = MODULE_GROUPS.find((group) =>
      group.items.some((item) =>
        item.path === '/'
          ? currentPath === '/'
          : currentPath === item.path || currentPath.startsWith(`${item.path}/`)
      )
    )

    if (activeGroup && !openGroups[activeGroup.id]) {
      setOpenGroups((prev) => {
        const next = { ...prev, [activeGroup.id]: true }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Ignora
        }
        return next
      })
    }
  }

  function handleToggleGroup(groupId: string, isOpen: boolean) {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: isOpen }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignora
      }
      return next
    })
  }

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          role="presentation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in-0"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl transition-all duration-200 ease-in-out w-72 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'}`}
      >
        {/* Header / Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <TrendingUp className="size-5" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-base tracking-tight leading-none">
                  FinanceFlow
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
                  Gestão Patrimonial
                </span>
              </div>
            )}
          </div>

          {/* Close button for Mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseMobile}
            className="lg:hidden text-sidebar-foreground/70"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </Button>

          {/* Collapse toggle for Desktop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden lg:flex size-7 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground"
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {/* Navigation list com Collapsible por Categoria */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3">
          {MODULE_GROUPS.map((group) => {
            const isOpen = openGroups[group.id] ?? true
            const hasActiveRoute = group.items.some((item) =>
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            )

            // Modo recolhido no desktop: exibe os ícones em fluxo contínuo com tooltip
            if (isCollapsed && !isMobileOpen) {
              return (
                <div key={group.id} className="space-y-1 py-1 border-b border-border/40 last:border-0">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      item.path === '/'
                        ? location.pathname === '/'
                        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        end={item.path === '/'}
                        title={item.title}
                        className={`group flex items-center justify-center size-10 rounded-xl transition-all mx-auto ${
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-xs'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <Icon className="size-4.5" />
                        <span className="sr-only">{item.title}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )
            }

            // Modo expandido (Desktop expandido ou Mobile) com Accordion/Collapsible
            return (
              <Collapsible
                key={group.id}
                open={isOpen}
                onOpenChange={(next) => handleToggleGroup(group.id, next)}
                className="space-y-1 rounded-xl transition-colors"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer select-none ${
                      hasActiveRoute
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <span className="truncate">{group.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-full bg-sidebar-accent/80 px-1.5 py-0.2 text-[10px] font-medium tabular text-muted-foreground">
                        {group.items.length}
                      </span>
                      <ChevronDown
                        className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                          isOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-0.5 pt-0.5 animate-in fade-in-50 duration-150">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      item.path === '/'
                        ? location.pathname === '/'
                        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        end={item.path === '/'}
                        onClick={() => {
                          if (isMobileOpen) onCloseMobile()
                        }}
                        className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-xs'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
