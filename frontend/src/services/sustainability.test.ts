import raw from '../test/fixtures/rutas/sostenibilidad-con-datos.json'
import empty from '../test/fixtures/rutas/sostenibilidad-sin-datos.json'
import { InvalidSustainability, parseSustainability, validPeriod } from '../domain/sustainability'
import { reportFileName, sustainabilityApi, SustainabilityError } from './sustainability'

const period = raw.periodo
const controller = () => new AbortController()
beforeEach(() => { vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000'); vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
const respond = (body: unknown, status = 200) => vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(body), { status }))

it('conserva el contrato ST-045 y consulta un agregado con cookie sin geometrías', async () => {
  respond(raw)
  const signal = controller().signal
  const data = await sustainabilityApi.load(period, signal)
  expect(data.metricas?.distancia_km).toBe(raw.distancia_km)
  expect(data.simulado).toBe(true)
  expect(fetch).toHaveBeenCalledWith(`http://127.0.0.1:8000/indicadores/sostenibilidad?desde=${period.desde}&hasta=${period.hasta}`,
    expect.objectContaining({ credentials: 'include', cache: 'no-store', signal: expect.any(AbortSignal) as AbortSignal }))
})
it('D06 distingue el vacío con null de los ceros reales y base cero', () => {
  expect(parseSustainability(empty, empty.periodo).metricas).toBeNull()
  const zero = { ...raw, distancia_km: 0, co2_kg: 0, combustible_l: 0, costo_soles: 0,
    ahorro_vs_secuencial: { distancia_km: 0, co2_kg: 0, combustible_l: 0, costo_soles: 0, pct: null }, cumplimiento_ventanas_pct: null }
  const data = parseSustainability(zero, period)
  expect(data.con_datos).toBe(true); expect(data.metricas?.distancia_km).toBe(0)
  expect(data.ahorro?.pct).toBeNull(); expect(data.cumplimiento_ventanas_pct).toBeNull()
})
it('D06 conserva ahorros negativos sin truncarlos a -100', () => {
  const data = parseSustainability({ ...raw, distancia_km: 150,
    ahorro_vs_secuencial: { ...raw.ahorro_vs_secuencial, distancia_km: -100, pct: -200 } }, period)
  expect(data.ahorro?.pct).toBe(-200)
})
it.each([
  null, [], { ...raw, periodo: empty.periodo }, { ...raw, distancia_km: null }, { ...raw, co2_kg: -1 },
  { ...raw, combustible_l: Infinity }, { ...raw, rutas_cerradas: 0 }, { ...raw, rutas_cerradas: 1.5 },
  { ...raw, simulado: undefined }, { ...raw, parametros_versiones: [] }, { ...raw, parametros_versiones: [5] },
  { ...raw, cumplimiento_ventanas_pct: 101 }, { ...raw, ahorro_vs_secuencial: null },
  { ...raw, ahorro_vs_secuencial: { ...raw.ahorro_vs_secuencial, pct: 101 } },
  { ...raw, ahorro_vs_secuencial: { ...raw.ahorro_vs_secuencial, distancia_km: -10000 } },
  { ...empty, distancia_km: 0 }, { ...empty, rutas_cerradas: 1 }, { ...empty, parametros_versiones: ['X'] },
  { ...empty, cumplimiento_ventanas_pct: 0 },
])('rechaza un agregado incompleto o incoherente: %#', value => {
  expect(() => parseSustainability(value, value && !Array.isArray(value) && 'con_datos' in value && !value.con_datos ? empty.periodo : period)).toThrow(InvalidSustainability)
})
it.each([
  { desde: '', hasta: period.hasta }, { desde: '2026-02-30', hasta: period.hasta },
  { desde: period.hasta, hasta: period.desde },
])('D04 valida fechas antes de consultar: %#', async invalid => {
  expect(validPeriod(invalid)).toBe(false)
  await expect(sustainabilityApi.load(invalid, controller().signal)).rejects.toMatchObject({ kind: 'invalid_period' })
  expect(fetch).not.toHaveBeenCalled()
})
it('acepta un único día y conserva todas las versiones históricas distintas', () => {
  const one = { desde: '2026-11-08', hasta: '2026-11-08' }
  expect(parseSustainability({ ...raw, periodo: one, parametros_versiones: ['V1', 'V2', 'V1'] }, one).parametros_versiones).toEqual(['V1', 'V2'])
})
it.each([[401, 'unauthorized'], [403, 'forbidden'], [422, 'invalid_period'], [503, 'unavailable'], [404, 'unavailable']])('HTTP %s no es un vacío', async (status, kind) => {
  respond({ detail: 'PRIVATE_UNTRUSTED_DETAIL' }, Number(status))
  await expect(sustainabilityApi.load(period, controller().signal)).rejects.toMatchObject({ kind })
  await expect(sustainabilityApi.load(period, controller().signal)).rejects.not.toThrow('PRIVATE_UNTRUSTED_DETAIL')
})
it('distingue desconexión, aborto y JSON inválido sin divulgar detalles', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('private'))
  await expect(sustainabilityApi.load(period, controller().signal)).rejects.toBeInstanceOf(SustainabilityError)
  const aborted = controller(); aborted.abort()
  await expect(sustainabilityApi.load(period, aborted.signal)).rejects.toThrow('private')
  vi.mocked(fetch).mockResolvedValue(new Response('not-json'))
  await expect(sustainabilityApi.load(period, controller().signal)).rejects.toBeInstanceOf(InvalidSustainability)
})
it('rechaza un cuerpo UTF-8 que excede 250000 bytes', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ...raw, extra: 'á'.repeat(125000) })))
  await expect(sustainabilityApi.load(period, controller().signal)).rejects.toBeInstanceOf(InvalidSustainability)
})

// --- US-010: reporte PDF ---------------------------------------------------------
const pdfResponse = (body: BodyInit = '%PDF-1.4 contenido', type = 'application/pdf', status = 200) =>
  vi.mocked(fetch).mockResolvedValue(new Response(body, { status, headers: { 'content-type': type } }))
it('US-010 pide el PDF del periodo con cookie y sin caché', async () => {
  pdfResponse()
  const file = await sustainabilityApi.report(period, controller().signal)
  expect(file.size).toBeGreaterThan(0)
  expect(fetch).toHaveBeenCalledWith(`http://127.0.0.1:8000/indicadores/sostenibilidad/reporte?desde=${period.desde}&hasta=${period.hasta}`,
    expect.objectContaining({ credentials: 'include', cache: 'no-store', signal: expect.any(AbortSignal) as AbortSignal }))
  expect(reportFileName({ desde: '2026-11-01', hasta: '2026-11-30' })).toBe('reporte-sostenibilidad-2026-11-01-a-2026-11-30.pdf')
})
it.each([[401, 'unauthorized'], [403, 'forbidden'], [404, 'no_data'], [422, 'invalid_period'], [503, 'report_unavailable']])(
  'US-010 HTTP %s del reporte se traduce a %s sin divulgar el detalle', async (status, kind) => {
    pdfResponse(JSON.stringify({ detail: 'PRIVATE_UNTRUSTED_DETAIL' }), 'application/json', Number(status))
    const error = await sustainabilityApi.report(period, controller().signal).catch((e: unknown) => e)
    expect(error).toMatchObject({ kind }); expect(String(error)).not.toContain('PRIVATE_UNTRUSTED_DETAIL')
  })
it.each([
  ['un HTML en vez de PDF', () => pdfResponse('<html></html>', 'text/html')],
  ['un PDF vacío', () => pdfResponse('')],
  ['un archivo de más de 5 MB', () => pdfResponse(new Uint8Array(5_000_001))],
  ['una desconexión', () => vi.mocked(fetch).mockRejectedValue(new Error('private'))],
])('US-010 rechaza %s', async (_name, prepare) => {
  prepare()
  await expect(sustainabilityApi.report(period, controller().signal)).rejects.toMatchObject({ kind: 'report_unavailable' })
})
it('US-010 valida el periodo antes de pedir y respeta el aborto', async () => {
  await expect(sustainabilityApi.report({ desde: period.hasta, hasta: period.desde }, controller().signal)).rejects.toMatchObject({ kind: 'invalid_period' })
  expect(fetch).not.toHaveBeenCalled()
  vi.mocked(fetch).mockRejectedValue(new Error('aborted'))
  const aborted = controller(); aborted.abort()
  await expect(sustainabilityApi.report(period, aborted.signal)).rejects.toThrow('aborted')
})
