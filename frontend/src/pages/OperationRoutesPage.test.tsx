import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OperationRoutesPage } from './OperationRoutesPage'
import { OperationRoutesError } from '../services/operationRoutes'
import type { RouteSource } from '../services/operationRoutes'
import type { OperationRoute, OptimizationDetail, OptimizationPage } from '../domain/operationRoutes'
import { InvalidRouteData } from '../domain/operationRoutes'
import { degradedTraffic, operationFixture, operationPage, withSyntheticTraffic } from '../test/operationRoutesFixtures'

vi.mock('../domain/operationRoutes', async original => ({ ...await original<typeof import('../domain/operationRoutes')>(), operationDateInLima: () => '2026-11-20' }))
vi.mock('../components/OperationRouteMap', () => ({ OperationRouteMap: ({ route }: { route: OperationRoute }) =>
  <div data-testid="route-map" data-route={route.ruta_id} data-sequences={route.paradas.map(p => p.secuencia).join(',')}>Mapa de prueba</div> }))
let source: RouteSource
beforeEach(() => { source = { optimize: vi.fn(), list: vi.fn().mockResolvedValue(operationPage()), detail: vi.fn().mockResolvedValue(operationFixture()) } })
function show() { const expired = vi.fn(); return { ...render(<OperationRoutesPage source={source} onSessionExpired={expired} />), expired } }
const listMock = () => vi.mocked(source.list)
const detailMock = () => vi.mocked(source.detail)
const routeHeading = () => screen.findByRole('heading', { name: 'Ruta ECO-101' })

it('M01: mapa y alternativa accesible usan misma ruta, orden y ETA con teclado', async () => {
  const user = userEvent.setup(); show(); await routeHeading()
  expect(await screen.findByTestId('route-map')).toHaveAttribute('data-sequences', '1,2,3,4,5,6,7')
  const stops = screen.getByRole('heading', { name: 'Secuencia de paradas' }).parentElement!
  expect(within(stops).getAllByRole('button', { name: /^Ver parada \d+ en mapa$/u })).toHaveLength(7)
  expect(within(stops).getByRole('heading', { name: 'Parada 1' })).toBeInTheDocument()
  expect(within(stops).getAllByText(/ETA estimada \(Lima\)/)).toHaveLength(7)
  expect(screen.getByText(/ETA del plan, estimación calculada/)).toHaveTextContent('No representa atención real')
  expect(screen.getByText('Sin datos de tráfico')).toBeInTheDocument()
  expect(screen.getByText('El servicio actual no publica alertas. Esto no garantiza ausencia de riesgos.')).toBeInTheDocument()
  const hide = screen.getByRole('button', { name: 'Ocultar mapa' }); hide.focus(); await user.keyboard('{Enter}')
  expect(screen.queryByTestId('route-map')).not.toBeInTheDocument()
  expect(within(stops).getByText(/-12.05099, -76.98311/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Ver parada 1 en mapa' }))
  expect(await screen.findByTestId('route-map')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Ruta ECO-102/ }))
  expect(await screen.findByRole('heading', { name: 'Ruta ECO-102' })).toBeInTheDocument()
  expect(screen.getByText('Datos simulados')).toBeInTheDocument()
})
it('muestra no asignados con motivo y consulta solo por fecha seleccionada', async () => {
  show(); await routeHeading()
  const section = screen.getByRole('heading', { name: 'Pedidos no asignados' }).parentElement!
  expect(within(section).getAllByRole('listitem')).toHaveLength(2)
  expect(section).toHaveTextContent('Excede la capacidad disponible')
  expect(listMock()).toHaveBeenCalledWith('2026-11-20', 1, expect.any(AbortSignal))
  listMock().mockResolvedValueOnce({ ...operationPage(), total: 0, items: [] })
  fireEvent.change(screen.getByLabelText('Fecha de operación'), { target: { value: '2026-11-22' } })
  expect(await screen.findByRole('heading', { name: 'Sin optimizaciones en esta fecha' })).toBeInTheDocument()
  expect(screen.getByText(/Solicita al responsable/)).toBeInTheDocument()
  expect(screen.queryByTestId('route-map')).not.toBeInTheDocument()
})
it('M02/M03: diferencia riesgo y bloqueo, conserva T0 al degradarse en T1 y no pierde el plan', async () => {
  const data = withSyntheticTraffic(); detailMock().mockResolvedValueOnce(data)
  show(); await routeHeading()
  expect(screen.getByRole('region', { name: 'Tiempos de tráfico por tramo' })).toHaveTextContent('Depósito → Parada 1: 12 min')
  expect(screen.getAllByText('Riesgo informativo · Severidad media').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Bloqueo configurado · Severidad alta').length).toBeGreaterThan(0)
  detailMock().mockResolvedValueOnce({ ...data, trafico: degradedTraffic() })
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar plan' }))
  const warning = await screen.findByText('Tráfico no disponible; último dato conservado')
  expect(warning.closest('[role="status"]')).toHaveTextContent('Fuente sintética M02')
  expect(warning.closest('[role="status"]')?.querySelector('time')).toHaveAttribute('datetime', '2026-11-20T08:00:00-05:00')
  expect(screen.getByRole('region', { name: 'Tiempos de tráfico por tramo' })).toHaveTextContent('12 min')
  expect(screen.getByText(/ETA del plan, estimación calculada/)).toBeInTheDocument()
})
it.each(['EN_PROCESO', 'FALLIDA', 'COMPLETADA'] as const)('M06: representa %s sin rutas de ejemplo', async estado => {
  detailMock().mockResolvedValueOnce({ ...operationFixture(), estado, rutas: [], no_asignados: [] })
  show()
  if (estado === 'EN_PROCESO') expect(await screen.findByText(/La optimización está en proceso/)).toBeInTheDocument()
  if (estado === 'FALLIDA') expect(await screen.findByRole('alert')).toHaveTextContent('La optimización falló')
  if (estado === 'COMPLETADA') expect(await screen.findByRole('heading', { name: 'La solución no contiene rutas' })).toBeInTheDocument()
  expect(screen.queryByTestId('route-map')).not.toBeInTheDocument()
})
it('M04: datos inválidos producen error seguro y nunca un mapa', async () => {
  detailMock().mockRejectedValueOnce(new InvalidRouteData())
  show()
  expect(await screen.findByRole('alert')).toHaveTextContent('Los datos de rutas son incoherentes')
  expect(screen.queryByTestId('route-map')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar plan' }))
  await routeHeading()
})
it('M05: una caída de tráfico en la primera consulta no inventa un último dato', async () => {
  detailMock().mockResolvedValueOnce({ ...operationFixture(), trafico: degradedTraffic() })
  show(); await routeHeading()
  expect(screen.getByText('Sin datos de tráfico')).toBeInTheDocument()
  expect(screen.queryByText('Tráfico no disponible; último dato conservado')).not.toBeInTheDocument()
})
it.each(['forbidden', 'not_found', 'unavailable', 'unauthorized'] as const)('M04: maneja %s y solo 401 cierra sesión', async kind => {
  detailMock().mockRejectedValueOnce(new OperationRoutesError(kind))
  const { expired } = show()
  if (kind === 'unauthorized') await waitFor(() => expect(expired).toHaveBeenCalledOnce())
  else { expect(await screen.findByRole('alert')).toHaveTextContent(new OperationRoutesError(kind).message); expect(expired).not.toHaveBeenCalled() }
})
it('un fallo de listado no se confunde con vacío; permite reintentar y paginar', async () => {
  listMock().mockRejectedValueOnce(new Error('PRIVATE'))
  show()
  expect(await screen.findByRole('alert')).not.toHaveTextContent('PRIVATE')
  expect(screen.queryByText('Sin optimizaciones en esta fecha')).not.toBeInTheDocument()
  listMock().mockResolvedValueOnce({ ...operationPage(), total: 13 })
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar optimizaciones' })); await routeHeading()
  listMock().mockResolvedValueOnce({ ...operationPage(), page: 2, total: 13 })
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
  expect(listMock()).toHaveBeenLastCalledWith('2026-11-20', 2, expect.any(AbortSignal))
})
it('ignora respuestas antiguas de listado y cancela al desmontar', async () => {
  let finish!: (value: OptimizationPage) => void
  listMock().mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const { unmount } = show()
  await waitFor(() => expect(listMock()).toHaveBeenCalledOnce())
  const firstSignal = listMock().mock.calls[0][2]
  listMock().mockResolvedValueOnce({ ...operationPage(), total: 0, items: [] })
  fireEvent.change(screen.getByLabelText('Fecha de operación'), { target: { value: '2026-11-22' } })
  await screen.findByText('Sin optimizaciones en esta fecha')
  await act(async () => { finish(operationPage()); await Promise.resolve() })
  expect(firstSignal.aborted).toBe(true)
  expect(detailMock()).not.toHaveBeenCalled()
  unmount()
})
it('ignora el detalle de una optimización abandonada', async () => {
  const data = operationFixture(), second = { ...data, optimizacion_id: '123e4567-e89b-42d3-a456-426614174000' }
  listMock().mockResolvedValueOnce({ ...operationPage(), total: 2, items: [operationPage().items[0], { ...operationPage().items[0], optimizacion_id: second.optimizacion_id }] })
  let finish!: (value: OptimizationDetail) => void
  detailMock().mockReturnValueOnce(new Promise(resolve => { finish = resolve })).mockResolvedValueOnce(second)
  show(); await screen.findByLabelText('Optimización')
  fireEvent.change(screen.getByLabelText('Optimización'), { target: { value: second.optimizacion_id } })
  await routeHeading()
  await act(async () => { finish({ ...data, rutas: [] }); await Promise.resolve() })
  expect(screen.getByRole('heading', { name: 'Ruta ECO-101' })).toBeInTheDocument()
})
it('un refresh fallido conserva la versión anterior y advierte su vigencia', async () => {
  show(); await routeHeading()
  detailMock().mockRejectedValueOnce(new OperationRoutesError('unavailable'))
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar plan' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Se conserva la última versión del plan')
  expect(screen.getByRole('heading', { name: 'Secuencia de paradas' })).toBeInTheDocument()
})


it.each([
  ['LICENCIA_VENCIDA', 'la licencia no cubre toda la conducción prevista'],
  ['DISPONIBILIDAD_INSUFICIENTE', 'disponibilidad insuficiente para esta ruta'],
  ['JORNADA_INVIABLE', 'se excede la jornada o falta el descanso requerido'],
] as const)('ECL-79: muestra la causa %s sin datos personales', async (motivo, mensaje) => {
  const detail = operationFixture()
  detail.rutas[0] = { ...detail.rutas[0], conductor: null, motivo_sin_conductor: motivo }
  detailMock().mockResolvedValueOnce(detail)
  show(); await routeHeading()
  expect(screen.getByText(new RegExp(mensaje))).toBeInTheDocument()
})


const emptyPage = () => ({ ...operationPage(), items: [], total: 0 })
const created = () => ({ optimizacion_id: operationFixture().optimizacion_id, estado: 'COMPLETADA' as const,
  solicitada_en: operationFixture().solicitada_en, simulado: false })
function showOperator() {
  const expired = vi.fn()
  return { ...render(<OperationRoutesPage source={source} role="OPERADOR" onSessionExpired={expired} />), expired }
}
const optimizeButton = () => screen.getByRole('button', { name: 'Optimizar fecha' })
it.each(['ADMINISTRADOR', 'ANALISTA', 'AUDITOR', 'CONDUCTOR'] as const)('no ofrece optimización a %s', async role => {
  render(<OperationRoutesPage source={source} role={role} onSessionExpired={vi.fn()} />)
  await routeHeading()
  expect(screen.queryByRole('button', { name: 'Optimizar fecha' })).not.toBeInTheDocument()
})
it('genera con teclado, anuncia progreso, evita doble envío y selecciona la nueva optimización', async () => {
  listMock().mockResolvedValueOnce(emptyPage())
  let finish!: (value: ReturnType<typeof created>) => void
  vi.mocked(source.optimize).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  showOperator()
  await screen.findByText('Pulsa Optimizar fecha para generar las rutas.')
  const user = userEvent.setup(), button = optimizeButton()
  button.focus(); await user.keyboard('{Enter}')
  expect(await screen.findByRole('button', { name: 'Optimizando…' })).toBeDisabled()
  expect(screen.getByText('Calculando rutas para 2026-11-20. Puede tardar hasta 30 segundos.')).toHaveAttribute('role', 'status')
  expect(screen.getByLabelText('Fecha de operación')).toBeDisabled()
  fireEvent.click(button); fireEvent.click(button)
  expect(source.optimize).toHaveBeenCalledExactlyOnceWith('2026-11-20', expect.any(AbortSignal))
  const otherId = '123e4567-e89b-42d3-a456-426614174000'
  listMock().mockResolvedValueOnce({ ...operationPage(), total: 2, items: [
    { ...operationPage().items[0], optimizacion_id: otherId }, operationPage().items[0],
  ] })
  await act(async () => { finish(created()); await Promise.resolve() })
  expect(await screen.findByText('Rutas generadas')).toHaveAttribute('role', 'status')
  await routeHeading()
  expect(screen.getByLabelText('Optimización')).toHaveValue(created().optimizacion_id)
  expect(detailMock()).toHaveBeenLastCalledWith(created().optimizacion_id, expect.any(AbortSignal))
  expect(listMock()).toHaveBeenCalledTimes(2)
  expect(optimizeButton()).toBeDisabled()
  expect(screen.getByText('Esta fecha ya tiene una optimización completada.')).toBeInTheDocument()
})
it.each([
  ['invalid_selection', 'No hay pedidos pendientes para la fecha elegida.'],
  ['invalid_selection', 'No hay vehículos activos utilizables para esta fecha.'],
  ['optimization_unavailable', 'No se pudo optimizar. Inténtalo de nuevo en un momento.'],
  ['optimization_forbidden', 'No tienes permiso para optimizar. Solo el Operador puede generar rutas.'],
] as const)('muestra %s, conserva fecha y permite reintentar', async (kind, message) => {
  listMock().mockResolvedValue(emptyPage())
  vi.mocked(source.optimize).mockRejectedValueOnce(new OperationRoutesError(kind, message)).mockResolvedValueOnce(created())
  showOperator(); await screen.findByText('Pulsa Optimizar fecha para generar las rutas.')
  await userEvent.click(optimizeButton())
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.getByLabelText('Fecha de operación')).toHaveValue('2026-11-20')
  expect(optimizeButton()).toBeEnabled()
  await userEvent.click(optimizeButton())
  expect(await screen.findByText('Rutas generadas')).toBeInTheDocument()
})
it('un 401 al optimizar usa onSessionExpired', async () => {
  listMock().mockResolvedValue(emptyPage())
  vi.mocked(source.optimize).mockRejectedValueOnce(new OperationRoutesError('unauthorized'))
  const { expired } = showOperator(); await screen.findByText('Pulsa Optimizar fecha para generar las rutas.')
  await userEvent.click(optimizeButton())
  await waitFor(() => expect(expired).toHaveBeenCalledOnce())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('deshabilita con COMPLETADA incluso en otra página y durante la consulta inicial', async () => {
  const failed = { ...operationPage().items[0], estado: 'FALLIDA' as const }
  listMock().mockResolvedValueOnce({ ...operationPage(), items: [failed], total: 13 })
    .mockResolvedValueOnce({ ...operationPage(), page: 2, total: 13 })
  showOperator()
  expect(optimizeButton()).toBeDisabled()
  await screen.findByText('Esta fecha ya tiene una optimización completada.')
  expect(optimizeButton()).toBeDisabled()
  expect(source.optimize).not.toHaveBeenCalled()
})
it('deshabilita con corrida EN_PROCESO y fecha inválida', async () => {
  listMock().mockResolvedValueOnce({ ...operationPage(), items: [{ ...operationPage().items[0], estado: 'EN_PROCESO' }] })
  showOperator()
  await screen.findByText('Esta fecha tiene una optimización en proceso. Actualiza el listado para consultar su resultado.')
  expect(optimizeButton()).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Fecha de operación'), { target: { value: '' } })
  expect(optimizeButton()).toBeDisabled()
  expect(await screen.findByText('Elige una fecha válida para optimizar.')).toBeInTheDocument()
})
it('cancela al desmontar y no carga un resultado abandonado', async () => {
  listMock().mockResolvedValue(emptyPage())
  let finish!: (value: ReturnType<typeof created>) => void
  vi.mocked(source.optimize).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const { unmount } = showOperator(); await screen.findByText('Pulsa Optimizar fecha para generar las rutas.')
  await userEvent.click(optimizeButton())
  const signal = vi.mocked(source.optimize).mock.calls[0][1]
  unmount()
  expect(signal.aborted).toBe(true)
  await act(async () => { finish(created()); await Promise.resolve() })
  expect(listMock()).toHaveBeenCalledOnce()
})
