import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShellUpdateNotice } from './ShellUpdateNotice'

const updates = vi.hoisted(() => ({ worker: null as ServiceWorker | null, listener: () => {}, apply: vi.fn<() => boolean>() }))
vi.mock('../services/offlineShell', () => ({
  getWaitingWorker: () => updates.worker,
  subscribeToShellUpdate: (listener: () => void) => { updates.listener = listener; return () => {} },
  applyUpdate: () => updates.apply(),
}))

beforeEach(() => {
  updates.worker = {} as ServiceWorker
  updates.apply.mockReset().mockReturnValue(true)
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
})
afterEach(() => vi.restoreAllMocks())

it('announces a waiting version without moving focus and applies with keyboard', async () => {
  const user = userEvent.setup()
  render(<ShellUpdateNotice />)
  expect(screen.getByRole('status')).toHaveTextContent('Hay una versión nueva de EcoLogística.')
  expect(screen.getByRole('button', { name: 'Actualizar' })).not.toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Actualizar' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(updates.apply).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Actualizando…' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Más tarde' })).toBeDisabled()
})

it('hides until there is a waiting worker', () => {
  updates.worker = null
  render(<ShellUpdateNotice />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  act(() => { updates.worker = {} as ServiceWorker; updates.listener() })
  expect(screen.getByRole('status')).toBeInTheDocument()
})

it('does not appear offline and responds to reconnection and disconnection', () => {
  const connectivity = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  render(<ShellUpdateNotice />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  connectivity.mockReturnValue(true)
  act(() => { window.dispatchEvent(new Event('online')) })
  expect(screen.getByRole('status')).toBeInTheDocument()
  connectivity.mockReturnValue(false)
  act(() => { window.dispatchEvent(new Event('offline')) })
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('More later dismisses only this waiting version and never applies it', async () => {
  const user = userEvent.setup()
  render(<ShellUpdateNotice />)
  await user.click(screen.getByRole('button', { name: 'Más tarde' }))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(updates.apply).not.toHaveBeenCalled()
  act(() => updates.listener())
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  act(() => { updates.worker = {} as ServiceWorker; updates.listener() })
  expect(screen.getByRole('status')).toBeInTheDocument()
})

it('keeps the notice and permits retry if activation could not be requested', async () => {
  updates.apply.mockReturnValueOnce(false)
  const user = userEvent.setup()
  render(<ShellUpdateNotice />)
  await user.click(screen.getByRole('button', { name: 'Actualizar' }))
  expect(screen.getByRole('status')).toHaveTextContent('No se pudo aplicar la actualización.')
  expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Actualizar' }))
  expect(updates.apply).toHaveBeenCalledTimes(2)
})
