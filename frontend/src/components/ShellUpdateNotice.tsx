import { useState, useSyncExternalStore } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { applyUpdate, getWaitingWorker, subscribeToShellUpdate } from '../services/offlineShell'
import { Button } from './ui'

export function ShellUpdateNotice() {
  const worker = useSyncExternalStore(subscribeToShellUpdate, getWaitingWorker, () => null)
  const online = useOnlineStatus()
  const [dismissed, setDismissed] = useState<ServiceWorker | null>(null)
  const [applying, setApplying] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!online || !worker || worker === dismissed) return null

  function update() {
    const accepted = applyUpdate()
    setApplying(accepted)
    setFailed(!accepted)
  }

  return <section className="shell-update-notice" role="status" aria-label="Actualización de EcoLogística">
    <div>
      <p>Hay una versión nueva de EcoLogística.</p>
      <p className="field-hint">Actualizar recarga las pestañas abiertas. Guarda primero los formularios.</p>
      {failed ? <p>No se pudo aplicar la actualización. Vuelve a intentarlo cuando tengas conexión.</p> : null}
    </div>
    <div className="shell-update-notice__actions">
      <Button disabled={applying} onClick={update}>{applying ? 'Actualizando…' : 'Actualizar'}</Button>
      <Button variant="secondary" disabled={applying} onClick={() => setDismissed(worker)}>Más tarde</Button>
    </div>
  </section>
}
