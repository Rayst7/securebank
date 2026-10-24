import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function NotFoundPage() {
  return (
    <main className="not-found">
      <EmptyState
        icon="alert"
        title="Página no encontrada"
        description="La ruta que buscas no existe o fue movida."
        action={
          <Link className="btn btn-primary" to="/dashboard">
            Volver al resumen
          </Link>
        }
      />
    </main>
  )
}
