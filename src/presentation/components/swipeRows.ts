import { useSyncExternalStore } from 'react'

let openId: string | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export function getSwipeOpenId(): string | null {
  return openId
}

export function openSwipeRow(id: string) {
  if (openId !== id) {
    openId = id
    emit()
  }
}

export function closeSwipeRows() {
  if (openId !== null) {
    openId = null
    emit()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Subscribes the current row to the single-open swipe state. */
export function useSwipeOpenId(): string | null {
  return useSyncExternalStore(subscribe, getSwipeOpenId)
}
