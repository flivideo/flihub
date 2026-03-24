interface ErrorMessageProps {
  message?: string;
}

export function ErrorMessage({ message = 'An error occurred' }: ErrorMessageProps) {
  return (
    <div className="text-center py-12 bg-surface rounded-lg border border-warm">
      <p className="text-red-500">{message}</p>
    </div>
  );
}
