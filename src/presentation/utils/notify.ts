export function notifyIconUrl(): string {
  try {
    return new URL('/icon-192.png', window.location.origin).href
  } catch {
    return '/icon-192.png'
  }
}

/**
 * Shows a system notification using the service worker registration when
 * available (most reliable for installed PWAs), falling back to the page-level
 * `Notification` API. Returns an error message on failure, or null on success.
 */
export async function showSystemNotification(title: string, body: string): Promise<string | null> {
  if (typeof Notification === 'undefined') {
    return 'Notifications are not supported in this browser'
  }
  if (Notification.permission !== 'granted') {
    return 'Notification permission is not granted'
  }
  const options: NotificationOptions = { body, icon: notifyIconUrl() }
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, options)
        return null
      }
    } catch {
      /* fall through to the page-level Notification API */
    }
  }
  try {
    new Notification(title, options)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'Could not send the notification'
  }
}
