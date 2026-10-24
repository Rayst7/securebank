import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({
  title,
  subtitle,
  actions,
  className = '',
  children,
}: CardProps) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <header className="card-header">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
