import type { ReactNode } from 'react'
import { Alert } from './Alert'
import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'

interface DataStateProps {
  loading: boolean
  error: string | null
  isEmpty: boolean
  emptyTitle: string
  emptyDescription?: string
  onRetry?: () => void
  children: ReactNode
}

export function DataState({
  loading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div className="loading-block">
        <Spinner />
        <span>Cargando información…</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert kind="error" title="No se pudo cargar la información">
        <p>{error}</p>
        {onRetry && (
          <div className="alert-actions">
            <Button variant="secondary" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        )}
      </Alert>
    )
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return <>{children}</>
}
