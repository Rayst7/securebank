import { useState, type FormEvent } from 'react'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { Input } from '../components/Input'
import { PageHeader } from '../components/PageHeader'
import { useApiQuery } from '../hooks/useApiQuery'
import { useToast } from '../hooks/useToast'
import { beneficiariesService } from '../services/beneficiaries.service'
import { formatDate } from '../utils/format'
import { accountNumberError, requiredText } from '../utils/validation'

export function BeneficiariesPage() {
  const { notify } = useToast()
  const beneficiaries = useApiQuery(() => beneficiariesService.list(), [])

  const [alias, setAlias] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('SecureBank')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const errors: Record<string, string> = {}
    const aliasError = requiredText(alias, 'El alias', 100)
    const accountError = accountNumberError(accountNumber)
    const bankError = requiredText(bankName, 'El banco', 100)

    if (aliasError) errors.alias = aliasError
    if (accountError) errors.accountNumber = accountError
    if (bankError) errors.bankName = bankError

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      await beneficiariesService.create({
        alias: alias.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
      })

      notify('success', 'Beneficiario registrado correctamente.')
      setAlias('')
      setAccountNumber('')
      setBankName('SecureBank')
      beneficiaries.reload()
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo registrar el beneficiario.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const list = beneficiaries.data ?? []

  return (
    <>
      <PageHeader
        title="Beneficiarios"
        subtitle="Guarda las cuentas que usas con frecuencia para transferir más rápido."
      />

      <div className="split">
        <Card title="Nuevo beneficiario" subtitle="Todos los campos son obligatorios">
          {formError && (
            <Alert kind="error" title="No se pudo guardar">
              {formError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              label="Alias"
              placeholder="Ej. Mamá, Renta, Universidad"
              maxLength={100}
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              error={fieldErrors.alias}
              data-testid="beneficiary-alias"
            />

            <Input
              label="Número de cuenta"
              placeholder="SB-10000002"
              maxLength={30}
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              hint="Solo letras, números y guiones."
              error={fieldErrors.accountNumber}
              data-testid="beneficiary-account"
            />

            <Input
              label="Banco"
              placeholder="SecureBank"
              maxLength={100}
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              error={fieldErrors.bankName}
              data-testid="beneficiary-bank"
            />

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              data-testid="beneficiary-submit"
            >
              {submitting ? 'Guardando…' : 'Guardar beneficiario'}
            </Button>
          </form>

          <p className="form-note">
            El número de cuenta se guarda como referencia. La transferencia hacia
            otras personas requiere el identificador (UUID) de la cuenta destino.
          </p>
        </Card>

        <Card
          title="Mis beneficiarios"
          subtitle={`${list.length} registrado${list.length === 1 ? '' : 's'}`}
          actions={
            <Button variant="ghost" onClick={beneficiaries.reload}>
              Actualizar
            </Button>
          }
        >
          <DataState
            loading={beneficiaries.loading}
            error={beneficiaries.error}
            isEmpty={list.length === 0}
            emptyTitle="Todavía no tienes beneficiarios"
            emptyDescription="Agrega el primero con el formulario de la izquierda."
            onRetry={beneficiaries.reload}
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Beneficiario</th>
                    <th>Cuenta</th>
                    <th>Registrado</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((beneficiary) => (
                    <tr key={beneficiary.id}>
                      <td>
                        <div className="cell-title">{beneficiary.alias}</div>
                        <div className="cell-sub">{beneficiary.bankName}</div>
                      </td>
                      <td className="cell-mono">{beneficiary.accountNumber}</td>
                      <td className="cell-muted">
                        {formatDate(beneficiary.createdAt)}
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
