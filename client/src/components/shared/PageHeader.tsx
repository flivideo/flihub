import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  children?: ReactNode  // For additional controls like OpenFolderButton
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-lg font-medium text-gray-700">{title}</h2>
      {children}
    </div>
  )
}
