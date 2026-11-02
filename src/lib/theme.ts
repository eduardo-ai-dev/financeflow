export type Theme = 'dark' | 'light'

/** Chave do localStorage. Deve ser a mesma usada pelo script inline em index.html. */
export const THEME_STORAGE_KEY = 'financeflow-theme'

/** Tema padrão do app quando não há preferência salva. */
export const DEFAULT_THEME: Theme = 'dark'

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
  } catch {
    // localStorage indisponível (modo privado restrito, etc.)
    return DEFAULT_THEME
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

