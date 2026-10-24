import type { ReactNode } from 'react'

type AlertKind = 'error' | 'success' | 'info' | 'warning'

interface AlertProps {
  kind?: AlertKind
  title?: string
  className?: string
  children: ReactNode
}

export function Alert({ kind = 'info', title, className = '', children }: AlertProps) {
  return (
    <div
      className={`alert alert-${kind} ${className}`.trim()}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {title && <strong className="alert-title">{title}</strong>}
      <div className="alert-body">{children}</div>
    </div>
  )
}
