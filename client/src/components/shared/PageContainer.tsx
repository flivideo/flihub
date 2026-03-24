import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return <div className="bg-surface rounded-lg border border-warm p-6">{children}</div>;
}
