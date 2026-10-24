import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { PageHeader } from '../components/PageHeader'
import { Select } from '../components/Select'
import { useApiQuery } from '../hooks/useApiQuery'
import { useToast } from '../hooks/useToast'
import { ApiError } from '../services/api'
import { accountsService } from '../services/accounts.service'
import { transfersService } from '../services/transfers.service'
import type { TransferResult } from '../types/transfer'
import { formatDate, formatMoney, shortenReference } from '../utils/format'
import { createIdempotencyKey } from '../utils/idempotency'
import { TRANSFER_STATUS_LABELS, statusTone } from '../utils/labels'
import { isUuid, parseAmount } from '../utils/validation'

type DestinationMode = 'own' | 'external'

export function TransferPage() {
  const { notify } = useToast()
  const accounts = useApiQuery(() => accountsService.list(), [])

  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [destinationMode, setDestinationMode] = useState<DestinationMode>('own')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<TransferResult | null>(null)

  const accountList = accounts.data ?? []
  const sourceAccountId =
    accountList.some((account) => account.id === selectedSourceId)
      ? selectedSourceId
      : (accountList[0]?.id ?? '')
  const sourceAccount = accountList.find((account) => account.id === sourceAccountId)
  const currency = sourceAccount?.currency ?? 'GTQ'

  const sourceOptions = accountList.map((account) => ({
    value: account.id,
    label: `${account.accountNumber} · ${formatMoney(account.balance, account.currency)}`,
  }))

  const destinationOptions = accountList
    .filter((account) => account.id !== sourceAccountId)
    .map((account) => ({
      value: account.id,
      label: `${account.accountNumber} · ${formatMoney(account.balance, account.currency)}`,
    }))

  const parsedAmount = parseAmount(amount)

  const changeMode = (mode: DestinationMode) => {
    setDestinationMode(mode)
    setDestinationAccountId('')
    setFieldErrors({})
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const errors: Record<string, string> = {}

    if (!sourceAccountId) {
      errors.source = 'Selecciona la cuenta de origen.'
    }

    if (!destinationAccountId) {
      errors.destination =
        destinationMode === 'own'
          ? 'Selecciona la cuenta destino.'
          : 'Ingresa el UUID de la cuenta destino.'
    } else if (destinationMode === 'external' && !isUuid(destinationAccountId)) {
      errors.destination = 'El identificador debe ser un UUID válido.'
    }

    if (destinationAccountId && destinationAccountId === sourceAccountId) {
      errors.destination = 'La cuenta destino debe ser diferente a la de origen.'
    }

    if (parsedAmount.error) {
      errors.amount = parsedAmount.error
    }

    if (description.trim().length > 255) {
      errors.description = 'La descripción no debe superar 255 caracteres.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      const result = await transfersService.create({
        sourceAccountId,
        destinationAccountId,
        amount: parsedAmount.value,
        idempotencyKey,
        ...(description.trim() ? { description: description.trim() } : {}),
      })

      setReceipt(result)
      notify('success', 'Transferencia realizada correctamente.')
      setAmount('')
      setDescription('')
      setDestinationAccountId('')
      setIdempotencyKey(createIdempotencyKey())
      accounts.reload()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setFormError(
          'No se pudo confirmar la operación: la clave de idempotencia ya fue usada o hubo un conflicto. Revisa tu historial antes de reintentar. Se conservó la misma clave para evitar duplicados.',
        )
      } else {
        setFormError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo realizar la transferencia.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (receipt) {
    return (
      <>
        <PageHeader
          title="Transferencia realizada"
          subtitle="El movimiento quedó registrado en tu cuenta."
        />

        <Card>
          <div className="receipt">
            <p className="receipt-label">Monto transferido</p>
            <p className="receipt-amount">
              {formatMoney(receipt.amount, receipt.currency)}
            </p>

            <dl className="receipt-grid">
              <div>
                <dt>Referencia</dt>
                <dd className="cell-mono" title={receipt.reference}>
                  {shortenReference(receipt.reference, 18)}
                </dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <Badge tone={statusTone(receipt.status)}>
                    {TRANSFER_STATUS_LABELS[receipt.status]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatDate(receipt.createdAt)}</dd>
              </div>
              <div>
                <dt>Descripción</dt>
                <dd>{receipt.description ?? 'Sin descripción'}</dd>
              </div>
            </dl>

            <div className="receipt-actions">
              <Button onClick={() => setReceipt(null)}>
                Hacer otra transferencia
              </Button>
              <Link className="btn btn-secondary" to="/historial">
                Ver historial
              </Link>
            </div>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Transferencias"
        subtitle="Envía dinero entre tus cuentas o a otra cuenta de SecureBank."
      />

      <div className="split">
        <Card title="Nueva transferencia" subtitle="Revisa los datos antes de confirmar">
          {formError && (
            <Alert kind="error" title="No se pudo completar la transferencia">
              {formError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Select
              label="Cuenta de origen"
              options={sourceOptions}
              value={sourceAccountId}
              onChange={(event) => {
                setSelectedSourceId(event.target.value)
                if (event.target.value === destinationAccountId) {
                  setDestinationAccountId('')
                }
              }}
              placeholder={sourceOptions.length === 0 ? 'Sin cuentas disponibles' : undefined}
              disabled={sourceOptions.length === 0}
              error={fieldErrors.source}
              hint={
                sourceAccount
                  ? `Saldo disponible: ${formatMoney(sourceAccount.balance, sourceAccount.currency)}`
                  : undefined
              }
              data-testid="transfer-source"
            />

            <div className="field">
              <span className="field-label">¿A dónde transferir?</span>
              <div className="segmented" role="group" aria-label="Tipo de cuenta destino">
                <button
                  type="button"
                  className={`segment${destinationMode === 'own' ? ' active' : ''}`}
                  aria-pressed={destinationMode === 'own'}
                  onClick={() => changeMode('own')}
                >
                  Una de mis cuentas
                </button>
                <button
                  type="button"
                  className={`segment${destinationMode === 'external' ? ' active' : ''}`}
                  aria-pressed={destinationMode === 'external'}
                  onClick={() => changeMode('external')}
                >
                  Otra cuenta (UUID)
                </button>
              </div>
            </div>

            {destinationMode === 'own' ? (
              <Select
                label="Cuenta destino"
                options={destinationOptions}
                value={destinationAccountId}
                onChange={(event) => setDestinationAccountId(event.target.value)}
                placeholder="Selecciona una cuenta"
                disabled={destinationOptions.length === 0}
                error={fieldErrors.destination}
                data-testid="transfer-destination"
              />
            ) : (
              <>
                <Input
                  label="ID de cuenta destino (UUID)"
                  placeholder="00000000-0000-4000-8000-000000000000"
                  value={destinationAccountId}
                  onChange={(event) => setDestinationAccountId(event.target.value)}
                  error={fieldErrors.destination}
                  data-testid="transfer-destination"
                />
                <Alert kind="info" title="Requisito actual de la API">
                  El backend exige el UUID de la cuenta destino. La búsqueda por
                  número de cuenta o por beneficiario todavía no está disponible.
                </Alert>
              </>
            )}

            <Input
              label={`Monto (${currency})`}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              hint="Mínimo 0.01 y máximo 1,000,000.00. Usa hasta dos decimales."
              error={fieldErrors.amount}
              data-testid="transfer-amount"
            />

            <Input
              label="Descripción (opcional)"
              placeholder="Ej. Pago de renta"
              maxLength={255}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              error={fieldErrors.description}
              data-testid="transfer-description"
            />

            <div className="form-summary">
              <span>Se transferirá</span>
              <strong>
                {parsedAmount.error ? '—' : formatMoney(parsedAmount.value, currency)}
              </strong>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              data-testid="transfer-submit"
            >
              {submitting ? 'Procesando…' : 'Confirmar transferencia'}
            </Button>
          </form>

          <p className="key-hint">
            Clave de idempotencia:{' '}
            <code title={idempotencyKey}>{shortenReference(idempotencyKey, 12)}</code>
          </p>
        </Card>

        <Card title="Antes de transferir" subtitle="Ten en cuenta estas reglas">
          <ul className="rule-list">
            <li>La cuenta de origen debe pertenecer a tu usuario y estar activa.</li>
            <li>La cuenta destino debe estar activa y usar la misma moneda.</li>
            <li>El saldo disponible debe cubrir el monto de la operación.</li>
            <li>
              Cada envío usa una clave de idempotencia para evitar cargos
              duplicados si la conexión falla.
            </li>
            <li>
              Si recibes un conflicto (409), revisa el historial antes de
              reintentar.
            </li>
          </ul>
        </Card>
      </div>
    </>
  )
}
