import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '../components/Icon'
import { useAuth } from '../hooks/useAuth'
import { initials } from '../utils/format'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Resumen', icon: 'dashboard' },
  { to: '/movimientos', label: 'Movimientos', icon: 'movements' },
  { to: '/transferencias', label: 'Transferencias', icon: 'transfer' },
  { to: '/beneficiarios', label: 'Beneficiarios', icon: 'beneficiaries' },
  { to: '/pagos', label: 'Pagos', icon: 'payments' },
  { to: '/historial', label: 'Historial', icon: 'history' },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Usuario'

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand brand-light">
            <span className="brand-mark" aria-hidden="true">
              <Icon name="bank" size={22} />
            </span>
            <span className="brand-name">SecureBank</span>
          </div>

          <nav className="nav" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-chip">
              <span className="avatar" aria-hidden="true">
                {user ? initials(user.firstName, user.lastName) : 'SB'}
              </span>
              <div className="user-meta">
                <strong>{fullName}</strong>
                <span>{user?.email ?? ''}</span>
              </div>
            </div>

            <button type="button" className="nav-link logout-link" onClick={handleLogout}>
              <Icon name="logout" size={19} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>

        <main className="app-main" id="main-content">
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}
