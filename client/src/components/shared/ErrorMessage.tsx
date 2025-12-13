interface ErrorMessageProps {
  message?: string
}

export function ErrorMessage({ message = 'An error occurred' }: ErrorMessageProps) {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
      <p className="text-red-500">{message}</p>
    </div>
  )
}
