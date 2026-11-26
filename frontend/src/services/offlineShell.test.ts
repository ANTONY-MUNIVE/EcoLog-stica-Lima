class WorkerStub extends EventTarget {
  state: ServiceWorkerState = 'installed'
  postMessage = vi.fn()
}

async function setup(waiting: WorkerStub | null = new WorkerStub(), controller: object | null = {}) {
  vi.resetModules()
  vi.stubEnv('PROD', true)
  vi.stubEnv('BASE_URL', '/ecolog/')
  const registration = Object.assign(new EventTarget(), {
    waiting, installing: null as WorkerStub | null, update: vi.fn().mockResolvedValue(undefined),
  })
  const container = Object.assign(new EventTarget(), { controller, register: vi.fn().mockResolvedValue(registration) })
  const connection = { serviceWorker: container, onLine: true }
  const visibility = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const reload = vi.fn()
  vi.stubGlobal('navigator', connection)
  vi.stubGlobal('document', visibility)
  vi.stubGlobal('window', { location: { reload } })
  const service = await import('./offlineShell')
  return { service, registration, container, connection, visibility, reload, waiting }
}

async function register(service: typeof import('./offlineShell')) {
  service.registerOfflineShell()
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('registers production at the configured base only once', async () => {
  const { service, container } = await setup()
  await register(service)
  service.registerOfflineShell()
  expect(container.register).toHaveBeenCalledExactlyOnceWith('/ecolog/sw.js')
})

it('does not register in development or unsupported browsers', async () => {
  const { service, container } = await setup()
  vi.stubEnv('PROD', false)
  service.registerOfflineShell()
  expect(container.register).not.toHaveBeenCalled()
  vi.stubEnv('PROD', true)
  vi.stubGlobal('navigator', {})
  expect(() => service.registerOfflineShell()).not.toThrow()
  expect(service.applyUpdate()).toBe(false)
})

it('detects an already waiting worker and supports unsubscribing', async () => {
  const { service, waiting, registration } = await setup()
  const listener = vi.fn()
  const unsubscribe = service.subscribeToShellUpdate(listener)
  await register(service)
  expect(service.getWaitingWorker()).toBe(waiting)
  expect(listener).toHaveBeenCalledTimes(1)
  unsubscribe()
  registration.installing = new WorkerStub()
  registration.dispatchEvent(new Event('updatefound'))
  registration.waiting = registration.installing
  registration.installing.dispatchEvent(new Event('statechange'))
  expect(listener).toHaveBeenCalledTimes(1)
})

it('does not announce the first installation or reload when it claims control', async () => {
  const { service, container, reload } = await setup(new WorkerStub(), null)
  await register(service)
  expect(service.getWaitingWorker()).toBeNull()
  expect(service.applyUpdate()).toBe(false)
  container.dispatchEvent(new Event('controllerchange'))
  expect(reload).not.toHaveBeenCalled()
})

it('detects an update installed after registration, not intermediate states', async () => {
  const { service, registration } = await setup(null)
  await register(service)
  const listener = vi.fn()
  service.subscribeToShellUpdate(listener)
  const worker = new WorkerStub()
  worker.state = 'installing'
  registration.installing = worker
  registration.dispatchEvent(new Event('updatefound'))
  registration.dispatchEvent(new Event('updatefound'))
  worker.dispatchEvent(new Event('statechange'))
  expect(service.getWaitingWorker()).toBeNull()
  registration.waiting = worker
  worker.state = 'installed'
  worker.dispatchEvent(new Event('statechange'))
  expect(service.getWaitingWorker()).toBe(worker)
  expect(listener).toHaveBeenCalledTimes(1)
  worker.dispatchEvent(new Event('statechange'))
  expect(listener).toHaveBeenCalledTimes(1)
  registration.waiting = null
  worker.state = 'redundant'
  worker.dispatchEvent(new Event('statechange'))
  expect(service.getWaitingWorker()).toBeNull()
})

it('observes installation already in progress when register resolves', async () => {
  const { service, registration } = await setup(null)
  const worker = new WorkerStub()
  worker.state = 'installing'
  registration.installing = worker
  await register(service)
  registration.waiting = worker
  worker.state = 'installed'
  worker.dispatchEvent(new Event('statechange'))
  expect(service.getWaitingWorker()).toBe(worker)
})

it('sends SKIP_WAITING on acceptance and reloads once despite repeated changes', async () => {
  const { service, waiting, container, reload } = await setup()
  await register(service)
  container.dispatchEvent(new Event('controllerchange'))
  expect(reload).not.toHaveBeenCalled()
  expect(service.applyUpdate()).toBe(true)
  expect(service.applyUpdate()).toBe(false)
  expect(waiting?.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'SKIP_WAITING' })
  container.controller = {}
  container.dispatchEvent(new Event('controllerchange'))
  container.controller = {}
  container.dispatchEvent(new Event('controllerchange'))
  expect(reload).toHaveBeenCalledTimes(1)
})

it('reloads other controlled tabs once when an accepted update takes over', async () => {
  const { service, container, reload } = await setup()
  await register(service)
  container.controller = {}
  container.dispatchEvent(new Event('controllerchange'))
  expect(reload).toHaveBeenCalledTimes(1)
})

it('does not reload a first claim but recognizes a later replacement', async () => {
  const { service, container, reload } = await setup(null, null)
  await register(service)
  container.controller = {}
  container.dispatchEvent(new Event('controllerchange'))
  expect(reload).not.toHaveBeenCalled()
  container.controller = {}
  container.dispatchEvent(new Event('controllerchange'))
  expect(reload).toHaveBeenCalledTimes(1)
})

it('refuses applying offline, missing, or non-installed workers', async () => {
  const { service, connection, registration, waiting } = await setup()
  expect(service.applyUpdate()).toBe(false)
  await register(service)
  connection.onLine = false
  expect(service.applyUpdate()).toBe(false)
  connection.onLine = true
  waiting!.state = 'activating'
  expect(service.applyUpdate()).toBe(false)
  registration.waiting = null
  expect(service.applyUpdate()).toBe(false)
})

it('allows retry if posting the message failed', async () => {
  const { service, waiting } = await setup()
  await register(service)
  waiting!.postMessage.mockImplementationOnce(() => { throw new Error('Worker unavailable') })
  expect(service.applyUpdate()).toBe(false)
  expect(service.applyUpdate()).toBe(true)
})

it('checks on becoming visible at most once per minute and ignores offline/hidden tabs', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  const { service, visibility, connection, registration } = await setup()
  await register(service)
  visibility.visibilityState = 'hidden'
  visibility.dispatchEvent(new Event('visibilitychange'))
  expect(registration.update).not.toHaveBeenCalled()
  visibility.visibilityState = 'visible'
  connection.onLine = false
  visibility.dispatchEvent(new Event('visibilitychange'))
  expect(registration.update).not.toHaveBeenCalled()
  connection.onLine = true
  visibility.dispatchEvent(new Event('visibilitychange'))
  visibility.dispatchEvent(new Event('visibilitychange'))
  vi.setSystemTime(59_999)
  visibility.dispatchEvent(new Event('visibilitychange'))
  expect(registration.update).toHaveBeenCalledTimes(1)
  vi.setSystemTime(60_000)
  registration.update.mockRejectedValueOnce(new Error('Network unavailable'))
  visibility.dispatchEvent(new Event('visibilitychange'))
  expect(registration.update).toHaveBeenCalledTimes(2)
  await Promise.resolve()
})

it('handles registration failure and permits another registration attempt', async () => {
  const { service, container } = await setup()
  container.register.mockRejectedValueOnce(new Error('Storage disabled'))
  await register(service)
  expect(service.getWaitingWorker()).toBeNull()
  await register(service)
  expect(container.register).toHaveBeenCalledTimes(2)
})
