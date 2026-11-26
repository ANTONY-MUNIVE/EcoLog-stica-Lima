let registration: ServiceWorkerRegistration | null = null
let waitingWorker: ServiceWorker | null = null
let started = false
let applying = false
let reloaded = false
let lastCheck = -Infinity
const listeners = new Set<() => void>()

export const getWaitingWorker = () => waitingWorker
export function subscribeToShellUpdate(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function detectWaiting() {
  const worker = navigator.serviceWorker.controller ? registration?.waiting ?? null : null
  if (waitingWorker === worker) return
  waitingWorker = worker
  listeners.forEach(listener => listener())
}

export function registerOfflineShell(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || started) return
  started = true
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    .then(result => {
      registration = result
      detectWaiting()
      const watched = new WeakSet<ServiceWorker>()
      const watchInstalling = () => {
        const worker = result.installing
        if (!worker || watched.has(worker)) return
        watched.add(worker)
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' || worker.state === 'redundant') detectWaiting()
        })
      }
      result.addEventListener('updatefound', watchInstalling)
      watchInstalling()
      let controller = navigator.serviceWorker.controller
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        detectWaiting()
        const next = navigator.serviceWorker.controller
        if (!next || next === controller) return
        const previouslyControlled = controller !== null
        controller = next
        // Acceptance activates the worker for every tab. Keep all old tabs on
        // matching assets, but never reload on first install/claim or in a loop.
        if (!previouslyControlled || reloaded) return
        reloaded = true
        window.location.reload()
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return
        const now = Date.now()
        if (now - lastCheck < 60_000) return
        lastCheck = now
        void result.update().catch(() => { /* Keep the current offline shell usable. */ })
      })
    })
    .catch(() => { started = false /* Online use remains available; no false offline-ready claim. */ })
}

export function applyUpdate(): boolean {
  const worker = registration?.waiting
  if (!worker || worker.state !== 'installed' || !navigator.serviceWorker.controller || !navigator.onLine || applying) return false
  applying = true
  try {
    worker.postMessage({ type: 'SKIP_WAITING' })
    return true
  } catch {
    applying = false
    return false
  }
}
