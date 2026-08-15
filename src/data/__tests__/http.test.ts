import { describe, it, expect } from 'vitest'
import { FetchHttp, HttpError, type Fetcher, type HttpResponse } from '../http'

function respond(body: unknown, status = 200): HttpResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

describe('FetchHttp', () => {
  it('rejects a hanging request after the timeout instead of hanging forever', async () => {
    const neverResolves: Fetcher = () => new Promise(() => {})
    const http = new FetchHttp('', neverResolves, 50)

    const started = Date.now()
    await expect(http.get('/api/health')).rejects.toMatchObject({
      name: 'HttpError',
      message: 'Network request failed',
    })
    expect(Date.now() - started).toBeLessThan(2000)
    await expect(http.get('/api/health').catch((e) => e.status)).resolves.toBeUndefined()
  }, 5000)

  it('passes through a normal response', async () => {
    const fetcher: Fetcher = async (path) => {
      expect(path).toBe('/api/health')
      return respond({ ok: true })
    }
    const http = new FetchHttp('', fetcher)
    await expect(http.get('/api/health')).resolves.toEqual({ ok: true })
  })

  it('surfaces non-2xx responses as HttpError', async () => {
    const fetcher: Fetcher = async () => respond({ error: 'nope' }, 500)
    const http = new FetchHttp('', fetcher)
    await expect(http.get('/api/health')).rejects.toMatchObject({
      name: 'HttpError',
      status: 500,
    })
  })

  it('sets the HTTP status on HttpError for a 404 response', async () => {
    const fetcher: Fetcher = async () => respond({ error: 'missing' }, 404)
    const http = new FetchHttp('', fetcher)
    await expect(http.get('/api/health')).rejects.toMatchObject({
      name: 'HttpError',
      message: 'Request failed with status 404',
      status: 404,
    })
  })

  it('leaves status undefined on HttpError for a network failure', async () => {
    const fetcher: Fetcher = async () => {
      throw new TypeError('Failed to fetch')
    }
    const http = new FetchHttp('', fetcher)
    await expect(http.get('/api/health')).rejects.toMatchObject({
      name: 'HttpError',
      message: 'Network request failed',
    })
    await expect(http.get('/api/health').catch((e) => e.status)).resolves.toBeUndefined()
  })

  it('surfaces fetch rejections as HttpError', async () => {
    const fetcher: Fetcher = async () => {
      throw new TypeError('Failed to fetch')
    }
    const http = new FetchHttp('', fetcher)
    await expect(http.get('/api/health')).rejects.toThrow(HttpError)
  })
})
