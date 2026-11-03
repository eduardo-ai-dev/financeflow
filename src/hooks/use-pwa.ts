import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)
    )
  })
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isAppleDevice] = useState(() => {
    if (typeof window === 'undefined') return false
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
  })

  useEffect(() => {
    // 1. Registra o Service Worker
    if ('serviceWorker' in navigator && import.meta.env.MODE !== 'test') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            // Verifica atualizações periodicamente
            reg.onupdatefound = () => {
              const installingWorker = reg.installing
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Novo conteúdo disponível silenciosamente atualizado
                  }
                }
              }
            }
          })
          .catch(() => {
            // Silencioso em caso de restrição local
          })
      })
    }

    // 2. Captura o evento de instalação nativa do navegador
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    function handleAppInstalled() {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    function handleOnline() {
      setIsOffline(false)
    }

    function handleOffline() {
      setIsOffline(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) return false

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      return true
    }

    return false
  }

  return {
    isInstallable,
    isInstalled,
    isOffline,
    isAppleDevice,
    promptInstall,
  }
}
