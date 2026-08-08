import { vi } from 'vitest'
import { createMockApi, type MockApi } from './mockApi'

export function setupApi(): MockApi {
  window.localStorage.clear()
  const api = createMockApi()
  vi.stubGlobal('fetch', api.fetchStub)
  return api
}
