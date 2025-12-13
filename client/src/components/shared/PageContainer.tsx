import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {children}
    </div>
  )
}
