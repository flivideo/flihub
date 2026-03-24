interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="text-center py-12 bg-surface rounded-lg border border-warm">
      <p className="text-warm-muted">{message}</p>
    </div>
  );
}
