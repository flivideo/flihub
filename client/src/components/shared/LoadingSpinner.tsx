interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
      <p className="text-gray-500">{message}</p>
    </div>
  )
}
