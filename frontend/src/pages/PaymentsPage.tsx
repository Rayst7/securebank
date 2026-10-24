import { useState, type FormEvent } from 'react'
import { Alert } from '../components/Alert'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { Input } from '../components/Input'
import { PageHeader } from '../components/PageHeader'
import { Select } from '../components/Select'
import { useApiQuery } from '../hooks/useApiQuery'
import { useToast } from '../hooks/useToast'
import { accountsService } from '../services/accounts.service'
import { paymentsService } from '../services/payments.service'
import type { Payment } from '../types/payment'
import { formatDate, formatMoney, shortenReference } from '../utils/format'
import { createIdempotencyKey } from '../utils/idempotency'
import { PAYMENT_STATUS_LABELS, statusTone } from '../utils/labels'
import { parseAmount, requiredText } from '../utils/validation'

export function PaymentsPage() {
  const { notify } = useToast()
  const accounts = useApiQuery(() => accountsService.list(), [])
  const payments = useApiQuery(() => paymentsService.list(), [])

  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [serviceReference, setServiceReference] = useState('')
  const [amount, setAmount] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [lastPayment, setLastPayment] = useState<Payment | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const accountList = accounts.data ?? []
  const accountId =
    accountList.some((account) => account.id === selectedAccountId)
      ? selectedAccountId
      : (accountList[0]?.id ?? '')
  const selectedAccount = accountList.find((account) => account.id === accountId)
  const currency = selectedAccount?.currency ?? 'GTQ'

  const accountOptions = accountList.map((account) => ({
    value: account.id,
    label: `${account.accountNumber} · ${formatMoney(account.balance, account.currency)}`,
  }))

  const parsedAmount = parseAmount(amount)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const errors: Record<string, string> = {}
    const serviceNameError = requiredText(serviceName, 'El servicio', 100)
    const referenceError = requiredText(
      serviceReference,
      'La referencia del servicio',
      100,
    )

    if (!accountId) errors.account = 'Selecciona la cuenta de cargo.'
    if (serviceNameError) errors.serviceName = serviceNameError
    if (referenceError) errors.serviceReference = referenceError
    if (parsedAmount.error) errors.amount = parsedAmount.error

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      const payment = await paymentsService.create({
        accountId,
        idempotencyKey,
        serviceName: serviceName.trim(),
        serviceReference: serviceReference.trim(),
        amount: parsedAmount.value,
      })

      setLastPayment(payment)
      notify('success', 'Pago registrado correctamente.')
      setServiceName('')
      setServiceReference('')
      setAmount('')
      setIdempotencyKey(createIdempotencyKey())
      payments.reload()
      accounts.reload()
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'No se pudo registrar el pago.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const paymentList = payments.data ?? []

  return (
    <>
      <PageHeader
        title="Pagos de servicios"
        subtitle="Paga luz, agua, internet y otros servicios desde tus cuentas."
      />

      <div className="split">
        <Card title="Nuevo pago" subtitle="El cargo se aplica de inmediato">
          {lastPayment && (
            <Alert kind="success" title="Pago registrado">
              {lastPayment.serviceName} por{' '}
              {formatMoney(lastPayment.amount, lastPayment.currency)}. Referencia{' '}
              <span className="cell-mono" title={lastPayment.id}>
                {shortenReference(lastPayment.id, 8)}
              </span>
              .
            </Alert>
          )}

          {formError && (
            <Alert kind="error" title="No se pudo registrar el pago">
              {formError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Select
              label="Cuenta de cargo"
              options={accountOptions}
              value={accountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              placeholder={accountOptions.length === 0 ? 'Sin cuentas disponibles' : undefined}
              disabled={accountOptions.length === 0}
              error={fieldErrors.account}
              hint={
                selectedAccount
                  ? `Saldo disponible: ${formatMoney(selectedAccount.balance, selectedAccount.currency)}`
                  : undefined
              }
              data-testid="payment-account"
            />

            <Input
              label="Servicio"
              placeholder="Ej. Energía eléctrica"
              maxLength={100}
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
              error={fieldErrors.serviceName}
              data-testid="payment-service"
            />

            <Input
              label="Referencia del servicio"
              placeholder="Ej. 123456789"
              maxLength={100}
              value={serviceReference}
              onChange={(event) => setServiceReference(event.target.value)}
              error={fieldErrors.serviceReference}
              data-testid="payment-reference"
            />

            <Input
              label={`Monto (${currency})`}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              hint="Mínimo 0.01 y máximo 1,000,000.00."
              error={fieldErrors.amount}
              data-testid="payment-amount"
            />

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              data-testid="payment-submit"
            >
              {submitting ? 'Procesando…' : 'Pagar servicio'}
            </Button>
          </form>

          <p className="key-hint">
            Clave de idempotencia:{' '}
            <code title={idempotencyKey}>{shortenReference(idempotencyKey, 12)}</code>
          </p>
        </Card>

        <Card
          title="Pagos recientes"
          subtitle={`${paymentList.length} registro${paymentList.length === 1 ? '' : 's'}`}
          actions={
            <Button variant="ghost" onClick={payments.reload}>
              Actualizar
            </Button>
          }
        >
          <DataState
            loading={payments.loading}
            error={payments.error}
            isEmpty={paymentList.length === 0}
            emptyTitle="Sin pagos registrados"
            emptyDescription="Cuando pagues un servicio aparecerá en esta lista."
            onRetry={payments.reload}
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Fecha</th>
                    <th className="text-right">Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentList.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div className="cell-title">{payment.serviceName}</div>
                        <div className="cell-sub">
                          Ref. {payment.serviceReference}
                        </div>
                      </td>
                      <td className="cell-muted">{formatDate(payment.createdAt)}</td>
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
          </DataState>
        </Card>
      </div>
    </>
  )
}
