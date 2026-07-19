const STORAGE_KEY = 'clocksy.shellTheme.v1'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return true
    if (stored === 'light') return false
  } catch {
    // ignore storage failures
  }
  return systemPrefersDark()
}

export function applyDark(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark)
}

/** Applies the persisted (or system) theme and keeps it in sync with the OS. */
export function initTheme(): void {
  applyDark(resolveInitialDark())

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', (e) => {
    let hasExplicit = false
    try {
      hasExplicit = localStorage.getItem(STORAGE_KEY) != null
    } catch {
      hasExplicit = false
    }
    if (!hasExplicit) applyDark(e.matches)
  })
}

export function setDark(dark: boolean): void {
  applyDark(dark)
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {
    // ignore storage failures
  }
}
