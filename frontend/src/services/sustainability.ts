import { buildApiUrl } from './api'
import { InvalidSustainability, parseSustainability, validPeriod } from '../domain/sustainability'
import type { Period, Sustainability } from '../domain/sustainability'

type ErrorKind = 'unauthorized' | 'forbidden' | 'invalid_period' | 'unavailable' | 'no_data' | 'report_unavailable'
const MESSAGES: Record<ErrorKind, string> = {
  unauthorized: 'Tu sesión ha vencido. Vuelve a iniciar sesión.',
  forbidden: 'No tienes permisos para consultar los indicadores de sostenibilidad.',
  invalid_period: 'Revisa el periodo: indica fechas válidas y un inicio anterior o igual al fin.',
  unavailable: 'No se pudieron cargar los indicadores. Revisa tu conexión e intenta de nuevo.',
  no_data: 'No existe información suficiente para generar el reporte de este periodo.',
  report_unavailable: 'No se pudo generar el reporte. Revisa tu conexión e intenta de nuevo.',
}
/** The report is a few pages of text; anything bigger is not our PDF. */
const MAX_REPORT_BYTES = 5_000_000
export class SustainabilityError extends Error {
  constructor(readonly kind: ErrorKind) { super(MESSAGES[kind]); this.name = 'SustainabilityError' }
}
export interface SustainabilitySource {
  load: (period: Period, signal: AbortSignal) => Promise<Sustainability>
  /** US-010: PDF of the applied period (same totals as `load`). */
  report: (period: Period, signal: AbortSignal) => Promise<Blob>
}

export const reportFileName = (period: Period) => `reporte-sostenibilidad-${period.desde}-a-${period.hasta}.pdf`
export const sustainabilityApi: SustainabilitySource = {
  async load(period, signal) {
    if (!validPeriod(period)) throw new SustainabilityError('invalid_period')
    let response: Response
    try {
      response = await fetch(buildApiUrl(`indicadores/sostenibilidad?${new URLSearchParams({ ...period })}`), {
        credentials: 'include', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      })
    } catch (error) { if (signal.aborted) throw error; throw new SustainabilityError('unavailable') }
    if (response.status !== 200) throw new SustainabilityError(response.status === 401 ? 'unauthorized'
      : response.status === 403 ? 'forbidden' : response.status === 422 ? 'invalid_period' : 'unavailable')
    let raw: unknown
    try {
      const text = await response.text()
      if (new TextEncoder().encode(text).length > 250_000) throw new InvalidSustainability()
      raw = JSON.parse(text)
    } catch { throw new InvalidSustainability() }
    return parseSustainability(raw, period)
  },
  async report(period, signal) {
    if (!validPeriod(period)) throw new SustainabilityError('invalid_period')
    let response: Response
    try {
      response = await fetch(buildApiUrl(`indicadores/sostenibilidad/reporte?${new URLSearchParams({ ...period })}`), {
        credentials: 'include', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
      })
    } catch (error) { if (signal.aborted) throw error; throw new SustainabilityError('report_unavailable') }
    if (response.status !== 200) throw new SustainabilityError(response.status === 401 ? 'unauthorized'
      : response.status === 403 ? 'forbidden' : response.status === 404 ? 'no_data'
        : response.status === 422 ? 'invalid_period' : 'report_unavailable')
    if (!(response.headers.get('content-type') ?? '').startsWith('application/pdf')) throw new SustainabilityError('report_unavailable')
    let file: Blob
    try { file = await response.blob() } catch (error) { if (signal.aborted) throw error; throw new SustainabilityError('report_unavailable') }
    if (file.size === 0 || file.size > MAX_REPORT_BYTES) throw new SustainabilityError('report_unavailable')
    return file
  },
}
