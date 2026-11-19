import { request } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'
import { API_URL, USERS, apiLogin, hoyLima, password, type DetalleOptimizacion, type ListaOptimizaciones } from './support'

/**
 * Runs once before the three browser projects: makes sure today's date has a
 * completed optimization (150 orders, 15 vehicles) and stores which routes each
 * browser will close, so the projects never touch the same route.
 */
export default async function globalSetup(): Promise<void> {
  const fecha = hoyLima()
  const api = await request.newContext()
  try {
    await apiLogin(api, USERS.operador, password('OPERADOR'))
    const lista = await api.get(`${API_URL}/optimizaciones?fecha_operacion=${fecha}`)
    if (!lista.ok()) throw new Error(`GET /optimizaciones respondió ${lista.status()}`)
    const body = await lista.json() as ListaOptimizaciones
    const items = body.items ?? []
    let id = items.find((o) => o.estado === 'COMPLETADA')?.optimizacion_id
    let segundos: number | null = null
    if (!id) {
      const inicio = Date.now()
      const creada = await api.post(`${API_URL}/optimizaciones`, { data: { fecha_operacion: fecha }, timeout: 120_000 })
      segundos = (Date.now() - inicio) / 1000
      if (creada.status() !== 201) throw new Error(`POST /optimizaciones respondió ${creada.status()}: ${await creada.text()}`)
      id = (await creada.json() as DetalleOptimizacion).optimizacion_id
    }
    const detalle = await (await api.get(`${API_URL}/optimizaciones/${id}`)).json() as DetalleOptimizacion
    const rutas = detalle.rutas
      .filter((r) => r.paradas.length >= 2)
      .sort((a, b) => a.paradas.length - b.paradas.length)
    await mkdir('playwright-report', { recursive: true })
    await writeFile('playwright-report/plan-e2e.json', JSON.stringify({
      fecha, optimizacion_id: id, segundos_optimizacion: segundos,
      rutas: rutas.slice(0, 4).map((r) => ({ ruta_id: r.ruta_id, placa: r.vehiculo.placa })),
      no_asignados: (detalle.no_asignados ?? []).length,
    }, null, 2))
  } finally {
    await api.dispose()
  }
}
