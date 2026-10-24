import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Select } from '../components/Select'
import { useApiQuery } from '../hooks/useApiQuery'
import { accountsService } from '../services/accounts.service'
import {
  formatDate,
  formatMoney,
  formatSignedAmount,
  isCreditTransaction,
} from '../utils/format'
import { TRANSACTION_TYPE_LABELS } from '../utils/labels'

export function MovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const accounts = useApiQuery(() => accountsService.list(), [])

  const accountList = accounts.data ?? []
  const requestedAccountId = searchParams.get('cuenta') ?? ''
  const accountId = accountList.some((account) => account.id === requestedAccountId)
    ? requestedAccountId
    : (accountList[0]?.id ?? '')

  const transactions = useApiQuery(
    () => (accountId ? accountsService.transactions(accountId) : Promise.resolve([])),
    [accountId],
  )

  const items = transactions.data ?? []
  const selectedAccount = accountList.find((account) => account.id === accountId)
  const currency = selectedAccount?.currency ?? 'GTQ'

  const credits = items
    .filter((transaction) => isCreditTransaction(transaction.type))
    .reduce((total, transaction) => total + Number(transaction.amount), 0)

  const debits = items
    .filter((transaction) => !isCreditTransaction(transaction.type))
    .reduce((total, transaction) => total + Number(transaction.amount), 0)

  const accountOptions = accountList.map((account) => ({
    value: account.id,
    label: `${account.accountNumber} · ${formatMoney(account.balance, account.currency)}`,
  }))

  const handleAccountChange = (value: string) => {
    setSearchParams(value ? { cuenta: value } : {}, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle="Consulta los cargos y abonos de cada una de tus cuentas."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              accounts.reload()
              transactions.reload()
            }}
          >
            <Icon name="refresh" size={16} /> Actualizar
          </Button>
        }
      />

      <Card>
        <div className="toolbar">
          <Select
            label="Cuenta"
            options={accountOptions}
            value={accountId}
            onChange={(event) => handleAccountChange(event.target.value)}
            placeholder={accountOptions.length === 0 ? 'Sin cuentas disponibles' : undefined}
            disabled={accountOptions.length === 0}
            className="toolbar-field"
          />
        </div>

        <div className="summary-strip">
          <div>
            <span>Ingresos</span>
            <strong className="amount-credit">{formatMoney(credits, currency)}</strong>
          </div>
          <div>
            <span>Egresos</span>
            <strong>{formatMoney(debits, currency)}</strong>
          </div>
          <div>
            <span>Movimientos</span>
            <strong>{items.length}</strong>
          </div>
        </div>

        <DataState
          loading={transactions.loading || accounts.loading}
          error={transactions.error ?? accounts.error}
          isEmpty={items.length === 0}
          emptyTitle="Sin movimientos"
          emptyDescription="Esta cuenta todavía no registra cargos ni abonos."
          onRetry={transactions.reload}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Movimiento</th>
                  <th>Fecha</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {items.map((transaction) => {
                  const credit = isCreditTransaction(transaction.type)

                  return (
                    <tr key={transaction.id}>
                      <td>
                        <div className="cell-title">
                          {TRANSACTION_TYPE_LABELS[transaction.type]}
                        </div>
                        <div className="cell-sub">
                          {transaction.description ?? 'Sin descripción'}
                        </div>
                      </td>
                      <td className="cell-muted">{formatDate(transaction.createdAt)}</td>
                      <td
                        className={`text-right amount ${
                          credit ? 'amount-credit' : 'amount-debit'
                        }`}
                      >
                        {formatSignedAmount(
                          transaction.amount,
                          transaction.currency,
                          credit,
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DataState>
      </Card>
    </>
  )
}
