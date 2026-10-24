import { Link } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { Icon, type IconName } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useApiQuery } from '../hooks/useApiQuery'
import { useAuth } from '../hooks/useAuth'
import { accountsService } from '../services/accounts.service'
import { formatAccountNumber, formatMoney } from '../utils/format'
import { ACCOUNT_STATUS_LABELS, statusTone } from '../utils/labels'

interface QuickAction {
  to: string
  label: string
  description: string
  icon: IconName
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    to: '/transferencias',
    label: 'Nueva transferencia',
    description: 'Envía dinero entre cuentas',
    icon: 'transfer',
  },
  {
    to: '/pagos',
    label: 'Pagar servicio',
    description: 'Luz, agua, internet y más',
    icon: 'payments',
  },
  {
    to: '/beneficiarios',
    label: 'Beneficiarios',
    description: 'Administra tus contactos',
    icon: 'beneficiaries',
  },
]

export function DashboardPage() {
  const { user } = useAuth()
  const accounts = useApiQuery(() => accountsService.list(), [])

  const list = accounts.data ?? []
  const activeAccounts = list.filter((account) => account.status === 'ACTIVE')
  const currency = list[0]?.currency ?? 'GTQ'
  const totalBalance = list.reduce(
    (total, account) => total + Number(account.balance),
    0,
  )

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.firstName ?? 'cliente'}`}
        subtitle="Este es el resumen de tus cuentas en SecureBank."
        actions={
          <Link className="btn btn-secondary" to="/historial">
            Ver historial
          </Link>
        }
      />

      <div className="grid grid-3">
        <StatCard
          label="Saldo total"
          value={formatMoney(totalBalance, currency)}
          hint="Suma de todas tus cuentas"
          icon="card"
        />
        <StatCard
          label="Cuentas activas"
          value={`${activeAccounts.length} de ${list.length}`}
          hint="Disponibles para operar"
          icon="bank"
        />
        <StatCard
          label="Moneda principal"
          value={currency}
          hint="Moneda de tus cuentas"
          icon="shield"
        />
      </div>

      <Card
        title="Mis cuentas"
        subtitle="Saldos y estado actual"
        className="mt-24"
      >
        <DataState
          loading={accounts.loading}
          error={accounts.error}
          isEmpty={list.length === 0}
          emptyTitle="Aún no tienes cuentas"
          emptyDescription="Cuando el banco te asigne una cuenta aparecerá aquí."
          onRetry={accounts.reload}
        >
          <div className="grid grid-2">
            {list.map((account) => (
              <article className="account-card" key={account.id}>
                <div className="account-card-top">
                  <span className="account-number">
                    {formatAccountNumber(account.accountNumber)}
                  </span>
                  <Badge tone={statusTone(account.status)}>
                    {ACCOUNT_STATUS_LABELS[account.status]}
                  </Badge>
                </div>

                <p className="account-balance">
                  {formatMoney(account.balance, account.currency)}
                </p>
                <p className="account-meta">
                  Cuenta en {account.currency} · ID {account.id.slice(0, 8)}…
                </p>

                <Link
                  to={`/movimientos?cuenta=${account.id}`}
                  className="account-link"
                >
                  Ver movimientos <Icon name="arrowRight" size={16} />
                </Link>
              </article>
            ))}
          </div>
        </DataState>
      </Card>

      <section className="mt-24">
        <h2 className="section-title">Acciones rápidas</h2>
        <div className="grid grid-3">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.to} to={action.to} className="quick-action">
              <span className="quick-action-icon" aria-hidden="true">
                <Icon name={action.icon} size={22} />
              </span>
              <strong>{action.label}</strong>
              <span>{action.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
