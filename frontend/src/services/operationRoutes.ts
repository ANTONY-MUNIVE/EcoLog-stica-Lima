import { buildApiUrl } from './api'
import { validUuid } from '../types/driverReport'
import { InvalidRouteData, parseOptimization, parseOptimizationCreated, parseOptimizationPage, validOperationDate } from '../domain/operationRoutes'
import type { OptimizationCreated, OptimizationDetail, OptimizationPage } from '../domain/operationRoutes'

export interface RouteSource {
  list: (date: string, page: number, signal: AbortSignal) => Promise<OptimizationPage>
  optimize: (date: string, signal: AbortSignal) => Promise<OptimizationCreated>
  detail: (id: string, signal: AbortSignal) => Promise<OptimizationDetail>
}
type ErrorKind = 'unauthorized' | 'forbidden' | 'not_found' | 'unavailable' | 'optimization_forbidden' | 'optimization_unavailable' | 'invalid_selection'
export const OPTIMIZATION_UNAVAILABLE = 'No se pudo optimizar. Inténtalo de nuevo en un momento.'
const MESSAGES: Record<ErrorKind, string> = {
  optimization_forbidden: 'No tienes permiso para optimizar. Solo el Operador puede generar rutas.',
  optimization_unavailable: OPTIMIZATION_UNAVAILABLE,
  invalid_selection: 'No se puede optimizar con la selección actual. Revisa los pedidos, los vehículos y los parámetros de la fecha.',
  unauthorized: 'Tu sesión ha vencido. Vuelve a iniciar sesión.',
  forbidden: 'Solo Administrador y Operador pueden consultar el detalle de las rutas.',
  not_found: 'La optimización ya no está disponible. Actualiza el listado.',
  unavailable: 'No se pudieron cargar las rutas. Revisa tu conexión e intenta de nuevo.',
}
export class OperationRoutesError extends Error {
  constructor(readonly kind: ErrorKind, message = MESSAGES[kind]) { super(message); this.name = 'OperationRoutesError' }
}
const SELECTION_REASONS: Record<string, string> = {
  'No hay pedidos PENDIENTE para la fecha': 'No hay pedidos pendientes para la fecha elegida.',
  'No hay vehículos ACTIVO': 'No hay vehículos activos utilizables para esta fecha.',
  'La fecha tiene más de 150 pedidos PENDIENTE; indica cuáles optimizar': 'La fecha supera el límite de 150 pedidos. Solicita seleccionar cuáles optimizar.',
  'Hay más de 15 vehículos ACTIVO; indica cuáles usar': 'Hay más de 15 vehículos activos. Solicita seleccionar cuáles usar.',
  'No hay una versión de parámetros vigente (EN-008)': 'No hay parámetros de optimización vigentes. Solicita su configuración.',
}
async function selectionError(response: Response): Promise<OperationRoutesError> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = body.detail
      if (detail && typeof detail === 'object' && 'motivo' in detail && typeof detail.motivo === 'string'
        && Object.hasOwn(SELECTION_REASONS, detail.motivo)) {
        return new OperationRoutesError('invalid_selection', SELECTION_REASONS[detail.motivo])
      }
    }
  } catch { /* Unknown responses must never echo submitted values. */ }
  return new OperationRoutesError('invalid_selection')
}
async function request(path: string, signal: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(buildApiUrl(path), { credentials: 'include', cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]) })
  } catch (error) {
    if (signal.aborted) throw error
    throw new OperationRoutesError('unavailable')
  }
  if (response.status !== 200) throw new OperationRoutesError(response.status === 401 ? 'unauthorized'
    : response.status === 403 ? 'forbidden' : response.status === 404 ? 'not_found' : 'unavailable')
  try { return await response.json() } catch { throw new InvalidRouteData() }
}
/** Queries keep 15 s; route generation has its own 60 s timeout. */
export const operationRoutesApi: RouteSource = {
  async optimize(date, signal) {
    if (!validOperationDate(date)) throw new InvalidRouteData()
    try {
      const response = await fetch(buildApiUrl('optimizaciones'), { method: 'POST', credentials: 'include', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha_operacion: date }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]) })
      if (response.status === 401) throw new OperationRoutesError('unauthorized')
      if (response.status === 403) throw new OperationRoutesError('optimization_forbidden')
      if (response.status === 422) throw await selectionError(response)
      if (response.status !== 201) throw new OperationRoutesError('optimization_unavailable')
      return parseOptimizationCreated(await response.json())
    } catch (error) {
      if (signal.aborted || error instanceof OperationRoutesError) throw error
      throw new OperationRoutesError('optimization_unavailable')
    }
  },
  async list(date, page, signal) {
    if (!validOperationDate(date) || !Number.isInteger(page) || page < 1) throw new InvalidRouteData()
    const result = parseOptimizationPage(await request(`optimizaciones?fecha=${date}&page=${page}&page_size=12`, signal))
    if (result.page !== page || result.page_size !== 12 || result.items.some(item => item.fecha_operacion !== date)) throw new InvalidRouteData()
    return result
  },
  async detail(id, signal) {
    if (!validUuid(id)) throw new InvalidRouteData()
    const result = parseOptimization(await request(`optimizaciones/${id}`, signal))
    if (result.optimizacion_id !== id) throw new InvalidRouteData()
    return result
  },
}
