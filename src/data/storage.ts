export interface Storage {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
}

export class LocalStorage implements Storage {
  constructor(private readonly prefix = 'bt.') {}

  get<T>(key: string): T | null {
    const raw = window.localStorage.getItem(this.prefix + key)
    if (raw === null) {
      return null
    }
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  set<T>(key: string, value: T): void {
    window.localStorage.setItem(this.prefix + key, JSON.stringify(value))
  }

  remove(key: string): void {
    window.localStorage.removeItem(this.prefix + key)
  }
}
