export class HttpError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export interface HttpResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

export interface Http {
  get<T>(path: string): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  del<T>(path: string): Promise<T>
}

export interface Fetcher {
  (input: string, init?: RequestInit): Promise<HttpResponse>
}

export class FetchHttp implements Http {
  constructor(
    private readonly base: string = '',
    private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
    private readonly timeoutMs: number = 8000,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = typeof AbortController === 'undefined' ? undefined : new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      // Race the request against a hard timeout so a hanging fetch (offline
      // reload, unreachable LAN server, service-worker passthrough) can never
      // block loadAll forever.
      const res = await new Promise<HttpResponse>((resolve, reject) => {
        timer = setTimeout(() => {
          controller?.abort()
          reject(new HttpError('Network request failed'))
        }, this.timeoutMs)
        Promise.resolve(
          this.fetcher(this.base + path, {
            ...init,
            headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
            signal: controller?.signal,
          }),
        ).then(resolve, () => reject(new HttpError('Network request failed')))
      })
      if (!res.ok) {
        throw new HttpError(`Request failed with status ${res.status}`, res.status)
      }
      return (await res.json()) as T
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path)
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) })
  }

  del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
