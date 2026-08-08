export class HttpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HttpError'
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
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: HttpResponse
    try {
      res = await this.fetcher(this.base + path, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      })
    } catch {
      throw new HttpError('Network request failed')
    }
    if (!res.ok) {
      throw new HttpError(`Request failed with status ${res.status}`)
    }
    return (await res.json()) as T
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
