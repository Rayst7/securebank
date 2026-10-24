import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { Input } from '../components/Input'
import { PageHeader } from '../components/PageHeader'
import { Select } from '../components/Select'
import { useApiQuery } from '../hooks/useApiQuery'
import { paymentsService } from '../services/payments.service'
import { transfersService } from '../services/transfers.service'
import { formatDate, formatMoney, shortenReference } from '../utils/format'
import {
  PAYMENT_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
  statusTone,
} from '../utils/labels'

type HistoryTab = 'transfers' | 'payments'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'COMPLETED', label: 'Completados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'FAILED', label: 'Fallidos' },
]

export function HistoryPage() {
  const transfers = useApiQuery(() => transfersService.list(), [])
  const payments = useApiQuery(() => paymentsService.list(), [])

  const [tab, setTab] = useState<HistoryTab>('transfers')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const transferList = useMemo(() => transfers.data ?? [], [transfers.data])
  const paymentList = useMemo(() => payments.data ?? [], [payments.data])
  const normalizedSearch = search.trim().toLowerCase()

  const filteredTransfers = useMemo(
    () =>
      transferList.filter((transfer) => {
        const matchesSearch =
          !normalizedSearch ||
          [
            transfer.reference,
            transfer.sourceAccount,
            transfer.destinationAccount,
            transfer.description ?? '',
          ].some((value) => value.toLowerCase().includes(normalizedSearch))

        const matchesStatus =
          statusFilter === 'ALL' || transfer.status === statusFilter

        return matchesSearch && matchesStatus
      }),
    [transferList, normalizedSearch, statusFilter],
  )

  const filteredPayments = useMemo(
    () =>
      paymentList.filter((payment) => {
        const matchesSearch =
          !normalizedSearch ||
          [payment.serviceName, payment.serviceReference].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          )

        const matchesStatus =
          statusFilter === 'ALL' || payment.status === statusFilter

        return matchesSearch && matchesStatus
      }),
    [paymentList, normalizedSearch, statusFilter],
  )

  const refreshAll = () => {
    transfers.reload()
    payments.reload()
  }

  const activeLoading = tab === 'transfers' ? transfers.loading : payments.loading
  const activeError = tab === 'transfers' ? transfers.error : payments.error
  const activeEmpty =
    tab === 'transfers' ? filteredTransfers.length === 0 : filteredPayments.length === 0

  return (
    <>
      <PageHeader
        title="Historial"
        subtitle="Consulta todas tus transferencias y pagos registrados."
        actions={
          <Button variant="secondary" onClick={refreshAll}>
            Actualizar
          </Button>
        }
      />

      <Card>
        <div className="tabs" role="tablist" aria-label="Tipo de operación">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'transfers'}
            className={`tab${tab === 'transfers' ? ' active' : ''}`}
            onClick={() => setTab('transfers')}
          >
            Transferencias
            <span className="tab-count">{transferList.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'payments'}
            className={`tab${tab === 'payments' ? ' active' : ''}`}
            onClick={() => setTab('payments')}
          >
            Pagos
            <span className="tab-count">{paymentList.length}</span>
          </button>
        </div>

        <div className="toolbar toolbar-wrap">
          <Input
            label="Buscar"
            placeholder="Referencia, cuenta o servicio"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="toolbar-field"
          />
          <Select
            label="Estado"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="toolbar-field toolbar-field-sm"
          />
        </div>

        <DataState
          loading={activeLoading}
          error={activeError}
          isEmpty={activeEmpty}
          emptyTitle={
            search || statusFilter !== 'ALL'
              ? 'Sin resultados'
              : 'Todavía no hay operaciones'
          }
          emptyDescription={
            search || statusFilter !== 'ALL'
              ? 'Prueba con otro término de búsqueda o cambia el filtro de estado.'
              : 'Cuando realices una transferencia o un pago aparecerá aquí.'
          }
          onRetry={refreshAll}
        >
          {tab === 'transfers' ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Referencia</th>
                    <th>Origen → Destino</th>
                    <th className="text-right">Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="cell-muted">{formatDate(transfer.createdAt)}</td>
                      <td className="cell-mono" title={transfer.reference}>
                        {shortenReference(transfer.reference, 10)}
                      </td>
                      <td>
                        <span className="cell-mono">{transfer.sourceAccount}</span>
                        <span className="arrow-sep">→</span>
                        <span className="cell-mono">{transfer.destinationAccount}</span>
                      </td>
                      <td className="text-right amount">
                        {formatMoney(transfer.amount, transfer.currency)}
                      </td>
                      <td>
                        <Badge tone={statusTone(transfer.status)}>
                          {TRANSFER_STATUS_LABELS[transfer.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Servicio</th>
                    <th>Referencia</th>
                    <th className="text-right">Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="cell-muted">{formatDate(payment.createdAt)}</td>
                      <td>
                        <div className="cell-title">{payment.serviceName}</div>
                        <div className="cell-sub">
                          Ref. {payment.serviceReference}
                        </div>
                      </td>
                      <td className="cell-mono" title={payment.id}>
                        {shortenReference(payment.id, 10)}
                      </td>
                      <td className="text-right amount">
                        {formatMoney(payment.amount, payment.currency)}
                      </td>
                      <td>
                        <Badge tone={statusTone(payment.status)}>
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </Card>
    </>
  )
}
