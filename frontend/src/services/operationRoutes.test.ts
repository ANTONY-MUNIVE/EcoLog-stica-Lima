import completed from '../test/fixtures/rutas/optimizacion-completada.json'
import { InvalidRouteData } from '../domain/operationRoutes'
import { operationRoutesApi, OPTIMIZATION_UNAVAILABLE } from './operationRoutes'

const page = { items: [completed], total: 1, page: 1, page_size: 12, simulado: true }
const signal = () => new AbortController().signal
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
beforeEach(() => { vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(page))) })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('consulta fecha y paginación con cookie, sin caché y con cancelación', async () => {
  const result = await operationRoutesApi.list('2026-11-20', 1, signal())
  expect(result.items[0].optimizacion_id).toBe(completed.optimizacion_id)
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/optimizaciones?fecha=2026-11-20&page=1&page_size=12',
    expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
  expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
})
it('consulta detalle, preserva simulado y declara SIN_DATOS en ST-045', async () => {
  vi.mocked(fetch).mockResolvedValue(reply(completed))
  const result = await operationRoutesApi.detail(completed.optimizacion_id, signal())
  expect(result.trafico.estado).toBe('SIN_DATOS')
  expect(result.simulado).toBe(true)
})
it.each([[401, 'unauthorized'], [403, 'forbidden'], [404, 'not_found'], [503, 'unavailable'], [422, 'unavailable']])('M04: HTTP %s produce error seguro %s', async (status, kind) => {
  vi.mocked(fetch).mockResolvedValue(reply('PRIVATE', Number(status)))
  await expect(operationRoutesApi.detail(completed.optimizacion_id, signal())).rejects.toMatchObject({ kind })
})
it('rechaza errores de red y JSON sin eco', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('PRIVATE'))
  await expect(operationRoutesApi.detail(completed.optimizacion_id, signal())).rejects.toMatchObject({ kind: 'unavailable' })
  vi.mocked(fetch).mockResolvedValueOnce(new Response('PRIVATE'))
  await expect(operationRoutesApi.detail(completed.optimizacion_id, signal())).rejects.toBeInstanceOf(InvalidRouteData)
})
it('no envía fechas o IDs inválidos y rechaza respuestas de otro contexto', async () => {
  await expect(operationRoutesApi.list('2026-02-30', 1, signal())).rejects.toBeInstanceOf(InvalidRouteData)
  await expect(operationRoutesApi.list('2026-11-20', 0, signal())).rejects.toBeInstanceOf(InvalidRouteData)
  await expect(operationRoutesApi.detail('private', signal())).rejects.toBeInstanceOf(InvalidRouteData)
  expect(fetch).not.toHaveBeenCalled()
  vi.mocked(fetch).mockResolvedValueOnce(reply({ ...page, page: 2 }))
  await expect(operationRoutesApi.list('2026-11-20', 1, signal())).rejects.toBeInstanceOf(InvalidRouteData)
  vi.mocked(fetch).mockResolvedValueOnce(reply(completed))
  await expect(operationRoutesApi.detail('123e4567-e89b-42d3-a456-426614174000', signal())).rejects.toBeInstanceOf(InvalidRouteData)
})
it('propaga cancelación sin procesarla como caída del servicio', async () => {
  const controller = new AbortController(); controller.abort()
  const failure = new DOMException('Aborted', 'AbortError')
  vi.mocked(fetch).mockRejectedValue(failure)
  await expect(operationRoutesApi.detail(completed.optimizacion_id, controller.signal)).rejects.toBe(failure)
})


const created = { optimizacion_id: completed.optimizacion_id, estado: 'COMPLETADA',
  solicitada_en: completed.solicitada_en, simulado: false }
it('optimiza con JSON, cookie y timeout propio de 60 segundos', async () => {
  const timeout = vi.spyOn(AbortSignal, 'timeout')
  vi.mocked(fetch).mockResolvedValueOnce(reply(created, 201))
  await expect(operationRoutesApi.optimize('2026-11-20', signal())).resolves.toEqual(created)
  expect(timeout).toHaveBeenLastCalledWith(60_000)
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/optimizaciones', expect.objectContaining({
    method: 'POST', credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha_operacion: '2026-11-20' }),
  }))
  await operationRoutesApi.list('2026-11-20', 1, signal()).catch(() => undefined)
  expect(timeout).toHaveBeenLastCalledWith(15_000)
  timeout.mockRestore()
})
it.each([[401, 'unauthorized'], [403, 'optimization_forbidden'], [503, 'optimization_unavailable'], [500, 'optimization_unavailable']])(
  'optimización HTTP %s produce %s sin eco', async (status, kind) => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ detail: 'PRIVATE' }, Number(status)))
    await expect(operationRoutesApi.optimize('2026-11-20', signal())).rejects.toMatchObject({ kind })
  })
it.each([
  ['No hay pedidos PENDIENTE para la fecha', 'No hay pedidos pendientes para la fecha elegida.'],
  ['No hay vehículos ACTIVO', 'No hay vehículos activos utilizables para esta fecha.'],
  ['Hay más de 15 vehículos ACTIVO; indica cuáles usar', 'Hay más de 15 vehículos activos. Solicita seleccionar cuáles usar.'],
  ['La fecha tiene más de 150 pedidos PENDIENTE; indica cuáles optimizar', 'La fecha supera el límite de 150 pedidos. Solicita seleccionar cuáles optimizar.'],
  ['No hay una versión de parámetros vigente (EN-008)', 'No hay parámetros de optimización vigentes. Solicita su configuración.'],
])('traduce el motivo 422: %s', async (motivo, message) => {
  vi.mocked(fetch).mockResolvedValueOnce(reply({ detail: { campo: 'seleccion', motivo } }, 422))
  await expect(operationRoutesApi.optimize('2026-11-20', signal())).rejects.toMatchObject({ kind: 'invalid_selection', message })
})
it.each([{ detail: { motivo: 'PRIVATE' } }, { detail: [] }, null, { detail: { motivo: 'toString' } }])(
  'usa mensaje seguro ante un motivo desconocido: %j', async body => {
    vi.mocked(fetch).mockResolvedValueOnce(reply(body, 422))
    await expect(operationRoutesApi.optimize('2026-11-20', signal())).rejects.toThrow('No se puede optimizar con la selección actual.')
  })
it('maneja 422 sin JSON y errores de red, timeout y respuesta inválida', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('PRIVATE', { status: 422 }))
  await expect(operationRoutesApi.optimize('2026-11-20', signal())).rejects.toMatchObject({ kind: 'invalid_selection' })
  for (const error of [new Error('PRIVATE'), new DOMException('Timeout', 'TimeoutError')]) {
    vi.mocked(fetch).mockRejectedValueOnce(error)
    await expect(operationRoutesApi.optimize('2026-11-20', signal())).rejects.toMatchObject({ message: OPTIMIZATION_UNAVAILABLE })
  }
  for (const response of [new Response('PRIVATE', { status: 201 }), reply({ ...created, estado: 'EN_PROCESO' }, 201)]) {
    vi.mocked(fetch).mockResolvedValueOnce(response)
    await expect(operationRoutesApi.optimize('2026-11-20', signal())).rejects.toMatchObject({ message: OPTIMIZATION_UNAVAILABLE })
  }
})
it('no optimiza una fecha inválida y propaga cancelación del consumidor', async () => {
  await expect(operationRoutesApi.optimize('2026-02-30', signal())).rejects.toBeInstanceOf(InvalidRouteData)
  expect(fetch).not.toHaveBeenCalled()
  const controller = new AbortController(); controller.abort()
  const error = new DOMException('Aborted', 'AbortError'); vi.mocked(fetch).mockRejectedValueOnce(error)
  await expect(operationRoutesApi.optimize('2026-11-20', controller.signal)).rejects.toBe(error)
})
