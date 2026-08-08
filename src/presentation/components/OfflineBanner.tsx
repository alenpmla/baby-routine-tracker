export default function OfflineBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="offline-banner" role="status">
      <span className="offline-text">Offline — changes are saved on this device and will sync when the server is reachable.</span>
      <button type="button" className="offline-retry" onClick={onRetry}>
        Retry sync
      </button>
    </div>
  )
}
