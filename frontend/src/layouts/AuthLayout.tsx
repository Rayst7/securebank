import { Navigate, Outlet } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useAuth } from '../hooks/useAuth'

export function AuthLayout() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="brand brand-light">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="bank" size={22} />
          </span>
          <span className="brand-name">SecureBank</span>
        </div>

        <div className="auth-brand-content">
          <p className="eyebrow">Banca digital segura</p>
          <h1>Tu dinero, claro y bajo control.</h1>
          <p className="auth-lead">
            Consulta tus cuentas, registra beneficiarios, transfiere y paga servicios
            desde un solo lugar.
          </p>
          <ul className="auth-points">
            <li>
              <Icon name="shield" size={18} /> Autenticación con JWT
            </li>
            <li>
              <Icon name="history" size={18} /> Historial de movimientos
            </li>
            <li>
              <Icon name="transfer" size={18} /> Transferencias idempotentes
            </li>
          </ul>
        </div>

        <p className="auth-foot">
          Proyecto académico · Aseguramiento de la Calidad de Software
        </p>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true">
                <Icon name="bank" size={22} />
              </span>
              <span className="brand-name">SecureBank</span>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
