import { Ionicons } from '@expo/vector-icons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Alert } from '../components/Alert'
import { AppText } from '../components/AppText'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DetailRow } from '../components/DetailRow'
import { Input } from '../components/Input'
import { KeyHint } from '../components/KeyHint'
import { Screen } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { SegmentedControl } from '../components/SegmentedControl'
import { SelectField } from '../components/SelectField'
import { useApiQuery } from '../hooks/useApiQuery'
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import { ApiError } from '../services/api'
import { accountsService } from '../services/accounts.service'
import { transfersService } from '../services/transfers.service'
import { colors, radius, spacing } from '../theme'
import type { TransferResult } from '../types/transfer'
import { formatDate, formatMoney } from '../utils/format'
import { createIdempotencyKey } from '../utils/idempotency'
import { TRANSFER_STATUS_LABELS, statusTone } from '../utils/labels'
import { isUuid, parseAmount } from '../utils/validation'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Transfer'>,
  NativeStackScreenProps<RootStackParamList, 'App'>
>

type DestinationMode = 'own' | 'external'

const RULES = [
  'La cuenta de origen debe pertenecer a tu usuario y estar activa.',
  'La cuenta destino debe existir, estar activa y usar la misma moneda.',
  'El saldo disponible debe cubrir el monto de la operación.',
  'Cada envío usa una clave de idempotencia para evitar cargos duplicados.',
  'Si recibes un conflicto (409), revisa el historial antes de reintentar.',
  'Para cuentas externas, la API exige el UUID de la cuenta destino.',
]

export function TransferScreen({ navigation }: Props) {
  const accounts = useApiQuery(() => accountsService.list(), [])

  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [mode, setMode] = useState<DestinationMode>('own')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<TransferResult | null>(null)

  useRefreshOnFocus(accounts.reload)

  const accountList = accounts.data ?? []
  const sourceAccountId = accountList.some(
    (account) => account.id === selectedSourceId,
  )
    ? selectedSourceId
    : (accountList[0]?.id ?? '')
  const sourceAccount = accountList.find(
    (account) => account.id === sourceAccountId,
  )
  const currency = sourceAccount?.currency ?? 'GTQ'

  const sourceOptions = accountList.map((account) => ({
    value: account.id,
    label: account.accountNumber,
    description: `${formatMoney(account.balance, account.currency)} · ${account.currency}`,
  }))

  const destinationOptions = accountList
    .filter((account) => account.id !== sourceAccountId)
    .map((account) => ({
      value: account.id,
      label: account.accountNumber,
      description: `${formatMoney(account.balance, account.currency)} · ${account.currency}`,
    }))

  const parsedAmount = parseAmount(amount)

  const changeMode = (nextMode: DestinationMode) => {
    setMode(nextMode)
    setDestinationAccountId('')
    setFieldErrors({})
  }

  const resetForm = () => {
    setReceipt(null)
    setMode('own')
    setDestinationAccountId('')
    setAmount('')
    setDescription('')
    setFieldErrors({})
    setFormError(null)
    setIdempotencyKey(createIdempotencyKey())
    void accounts.reload()
  }

  const handleSubmit = async () => {
    setFormError(null)

    const errors: Record<string, string> = {}
    const destination = destinationAccountId.trim()

    if (!sourceAccountId) {
      errors.source = 'Selecciona la cuenta de origen.'
    }

    if (!destination) {
      errors.destination =
        mode === 'own'
          ? 'Selecciona la cuenta destino.'
          : 'Ingresa el UUID de la cuenta destino.'
    } else if (mode === 'external' && !isUuid(destination)) {
      errors.destination = 'El identificador debe ser un UUID válido.'
    }

    if (destination && destination === sourceAccountId) {
      errors.destination = 'La cuenta destino debe ser diferente a la de origen.'
    }

    if (parsedAmount.error) {
      errors.amount = parsedAmount.error
    } else if (
      sourceAccount &&
      parsedAmount.value > Number(sourceAccount.balance)
    ) {
      errors.amount = `Saldo insuficiente. Disponible: ${formatMoney(
        sourceAccount.balance,
        sourceAccount.currency,
      )}.`
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
        destinationAccountId: destination,
        amount: parsedAmount.value,
        idempotencyKey,
        ...(description.trim() ? { description: description.trim() } : {}),
      })

      setReceipt(result)
      setAmount('')
      setDescription('')
      setDestinationAccountId('')
      setIdempotencyKey(createIdempotencyKey())
      void accounts.reload()
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
      <Screen>
        <ScreenHeader
          title="Transferencia realizada"
          subtitle="El movimiento quedó registrado en tu cuenta."
        />

        <View style={styles.successHero}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={30} color={colors.white} />
          </View>
          <AppText variant="caption" weight="700">
            MONTO TRANSFERIDO
          </AppText>
          <AppText variant="hero" color={colors.primaryStrong}>
            {formatMoney(receipt.amount, receipt.currency)}
          </AppText>
          <Badge
            label={TRANSFER_STATUS_LABELS[receipt.status]}
            tone={statusTone(receipt.status)}
            style={styles.heroBadge}
          />
        </View>

        <Card>
          <DetailRow label="Referencia">
            <AppText variant="mono" style={styles.reference}>
              {receipt.reference}
            </AppText>
          </DetailRow>
          <DetailRow label="Estado">
            <Badge
              label={TRANSFER_STATUS_LABELS[receipt.status]}
              tone={statusTone(receipt.status)}
            />
          </DetailRow>
          <DetailRow label="Fecha">
            <AppText variant="label" weight="600">
              {formatDate(receipt.createdAt)}
            </AppText>
          </DetailRow>
          <DetailRow label="Descripción">
            <AppText variant="label" weight="600" align="right">
              {receipt.description ?? 'Sin descripción'}
            </AppText>
          </DetailRow>
        </Card>

        <View style={styles.receiptActions}>
          <Button
            label="Hacer otra transferencia"
            icon="add-circle-outline"
            onPress={resetForm}
          />
          <Button
            label="Ver historial"
            variant="secondary"
            icon="time-outline"
            onPress={() => navigation.navigate('History')}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      refreshing={accounts.refreshing}
      onRefresh={accounts.reload}
    >
      <ScreenHeader
        title="Transferencias"
        subtitle="Envía dinero entre tus cuentas o a otra cuenta de SecureBank."
      />

      {formError ? (
        <Alert kind="error" title="No se pudo completar la transferencia">
          {formError}
        </Alert>
      ) : null}

      {!accounts.loading && accountList.length === 0 ? (
        <Alert kind="warning" title="Sin cuentas disponibles">
          Necesitas al menos una cuenta activa para realizar transferencias.
        </Alert>
      ) : null}

      <Card
        title="Nueva transferencia"
        subtitle="Revisa los datos antes de confirmar"
      >
        <SelectField
          label="Cuenta de origen"
          value={sourceAccountId}
          options={sourceOptions}
          onChange={(value) => {
            setSelectedSourceId(value)
            if (value === destinationAccountId.trim()) {
              setDestinationAccountId('')
            }
          }}
          placeholder={
            sourceOptions.length === 0
              ? 'Sin cuentas disponibles'
              : 'Selecciona una cuenta'
          }
          disabled={sourceOptions.length === 0}
          hint={
            sourceAccount
              ? `Saldo disponible: ${formatMoney(
                  sourceAccount.balance,
                  sourceAccount.currency,
                )}`
              : undefined
          }
          error={fieldErrors.source}
        />

        <AppText variant="label" style={styles.fieldLabel}>
          ¿A dónde transferir?
        </AppText>
        <SegmentedControl
          options={[
            { value: 'own', label: 'Una de mis cuentas' },
            { value: 'external', label: 'Otra cuenta (UUID)' },
          ]}
          value={mode}
          onChange={changeMode}
          accessibilityLabel="Tipo de cuenta destino"
        />

        {mode === 'own' ? (
          <SelectField
            label="Cuenta destino"
            value={destinationAccountId}
            options={destinationOptions}
            onChange={setDestinationAccountId}
            placeholder={
              destinationOptions.length === 0
                ? 'No tienes otra cuenta disponible'
                : 'Selecciona una cuenta'
            }
            disabled={destinationOptions.length === 0}
            error={fieldErrors.destination}
          />
        ) : (
          <>
            <Input
              label="ID de cuenta destino (UUID)"
              value={destinationAccountId}
              onChangeText={setDestinationAccountId}
              placeholder="00000000-0000-4000-8000-000000000000"
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldErrors.destination}
            />
            <Alert kind="info" title="Requisito actual de la API">
              El backend exige el UUID de la cuenta destino. La búsqueda por
              número de cuenta o por beneficiario todavía no está disponible.
            </Alert>
          </>
        )}

        <Input
          label={`Monto (${currency})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          hint="Mínimo 0.01 y máximo 1,000,000.00. Usa hasta dos decimales."
          error={fieldErrors.amount}
        />

        <Input
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Ej. Pago de renta"
          maxLength={255}
          error={fieldErrors.description}
        />

        <View style={styles.summaryBox}>
          <View style={styles.summaryText}>
            <AppText variant="caption">Se transferirá</AppText>
            <AppText variant="caption" numberOfLines={1}>
              Desde {sourceAccount?.accountNumber ?? '—'}
            </AppText>
          </View>
          <AppText variant="amount" color={colors.primaryStrong}>
            {parsedAmount.error ? '—' : formatMoney(parsedAmount.value, currency)}
          </AppText>
        </View>

        <Button
          label={submitting ? 'Procesando…' : 'Confirmar transferencia'}
          onPress={() => {
            void handleSubmit()
          }}
          loading={submitting}
          disabled={accountList.length === 0}
          fullWidth
          icon="paper-plane-outline"
          testID="transfer-submit"
        />

        <KeyHint value={idempotencyKey} />
      </Card>

      <Card
        title="Antes de transferir"
        subtitle="Reglas de la operación"
        style={styles.rulesCard}
      >
        {RULES.map((rule) => (
          <View key={rule} style={styles.ruleRow}>
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={colors.primary}
            />
            <AppText variant="caption" style={styles.ruleText}>
              {rule}
            </AppText>
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  fieldLabel: {
    marginBottom: 6,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#b7e4dc',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryText: {
    flex: 1,
    gap: 1,
  },
  rulesCard: {
    marginTop: spacing.lg,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  successHero: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroBadge: {
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  successIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    marginBottom: spacing.sm,
  },
  reference: {
    fontSize: 12,
    textAlign: 'right',
  },
  receiptActions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
})
