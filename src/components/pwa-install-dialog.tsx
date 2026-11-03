import { useState } from 'react'
import { usePwa } from '@/hooks/use-pwa'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Smartphone, Download, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react'

interface PwaInstallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PwaInstallDialog({ open, onOpenChange }: PwaInstallDialogProps) {
  const { isInstallable, isAppleDevice, promptInstall } = usePwa()
  const [isInstalling, setIsInstalling] = useState(false)

  async function handleInstallClick() {
    setIsInstalling(true)
    try {
      const installed = await promptInstall()
      if (installed) {
        onOpenChange(false)
      }
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 mx-auto sm:mx-0">
            <Smartphone className="size-6" />
          </div>
          <DialogTitle className="text-center sm:text-left text-lg font-bold">
            Instalar FinanceFlow no Celular
          </DialogTitle>
          <DialogDescription className="text-center sm:text-left text-xs leading-relaxed">
            Tenha a experiência completa de aplicativo nativo no seu smartphone para lançamentos ágeis e controle financeiro na palma da mão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          {/* Benefícios */}
          <div className="rounded-xl border bg-muted/25 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <span>Acesso em tela cheia sem barras de navegador</span>
            </div>
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <span>Inicialização instantânea e navegação ultra-rápida</span>
            </div>
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <span>Atalhos rápidos para lançar despesas no dia a dia</span>
            </div>
          </div>

          {/* Instruções para iOS Safari */}
          {isAppleDevice && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
              <span className="font-bold text-primary flex items-center gap-1.5 text-xs">
                <Sparkles className="size-3.5" />
                Como instalar no iPhone / iPad:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-xs leading-relaxed">
                <li>
                  No navegador Safari, toque no botão{' '}
                  <strong className="text-foreground inline-flex items-center gap-0.5">
                    Compartilhar <Share className="size-3 inline" />
                  </strong>{' '}
                  na barra inferior.
                </li>
                <li>
                  Role para baixo e selecione{' '}
                  <strong className="text-foreground inline-flex items-center gap-0.5">
                    Adicionar à Tela de Início <PlusSquare className="size-3 inline" />
                  </strong>
                  .
                </li>
                <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
              </ol>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Agora Não
          </Button>
          {!isAppleDevice && isInstallable && (
            <Button
              type="button"
              disabled={isInstalling}
              onClick={handleInstallClick}
              className="gap-2"
            >
              <Download className="size-4" />
              {isInstalling ? 'Instalando...' : 'Instalar Agora'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
