import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  hasError: boolean
  errorMessage: string | null
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorMessage: null,
    }
  }

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error ? error.message : 'Erro inesperado ao carregar o módulo.',
    }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo RouteErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center my-8 max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">
              Não foi possível carregar esta aba
            </h2>
            <p className="text-xs text-muted-foreground">
              {this.state.errorMessage || 'Ocorreu uma falha temporária ao carregar o módulo.'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: null })
              window.location.reload()
            }}
            className="gap-1.5 text-xs"
          >
            <RotateCw className="size-3.5" />
            Recarregar Página
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
