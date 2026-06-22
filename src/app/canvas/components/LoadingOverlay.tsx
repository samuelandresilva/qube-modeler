type LoadingOverlayProps = {
  message: string;
};

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div
      className="app-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="app-loading-overlay__content">
        <span className="app-loading-overlay__spinner" aria-hidden="true" />
        <strong>{message}</strong>
      </div>
    </div>
  );
}
