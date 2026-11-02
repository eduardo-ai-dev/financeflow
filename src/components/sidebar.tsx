import { NavLink } from 'react-router-dom'
import { MODULE_GROUPS } from '@/config/modules'
import { TrendingUp, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-in-out w-72 ${
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

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
          {MODULE_GROUPS.map((group) => (
            <div key={group.name} className="space-y-1">
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.name}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => {
                      if (isMobileOpen) onCloseMobile()
                    }}
                    title={isCollapsed && !isMobileOpen ? item.title : undefined}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-xs'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`
                    }
                  >
                    <Icon className="size-4.5 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
