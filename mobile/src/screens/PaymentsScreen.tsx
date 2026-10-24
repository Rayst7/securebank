import { Ionicons } from '@expo/vector-icons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Alert } from '../components/Alert'
import { AppText } from '../components/AppText'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { IconButton } from '../components/IconButton'
import { Input } from '../components/Input'
import { KeyHint } from '../components/KeyHint'
import { Screen } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { SelectField } from '../components/SelectField'
import { useApiQuery } from '../hooks/useApiQuery'
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import { accountsService } from '../services/accounts.service'
import { paymentsService } from '../services/payments.service'
import { colors, radius, spacing } from '../theme'
import type { Payment } from '../types/payment'
import { formatDate, formatMoney, shortenReference } from '../utils/format'
import { createIdempotencyKey } from '../utils/idempotency'
import { PAYMENT_STATUS_LABELS, statusTone } from '../utils/labels'
import { parseAmount, requiredText } from '../utils/validation'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Payments'>,
  NativeStackScreenProps<RootStackParamList, 'App'>
>

const QUICK_SERVICES = [
  'Energía eléctrica',
  'Agua potable',
  'Internet',
  'Teléfono',
]

export function PaymentsScreen({ navigation }: Props) {
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
  const accountId = accountList.some(
    (account) => account.id === selectedAccountId,
  )
    ? selectedAccountId
    : (accountList[0]?.id ?? '')
  const selectedAccount = accountList.find((account) => account.id === accountId)
  const currency = selectedAccount?.currency ?? 'GTQ'

  const accountOptions = accountList.map((account) => ({
    value: account.id,
    label: account.accountNumber,
    description: `${formatMoney(account.balance, account.currency)} · ${account.currency}`,
  }))

  const parsedAmount = parseAmount(amount)
  const paymentList = payments.data ?? []

  const refreshAll = useCallback(() => {
    void accounts.reload()
    void payments.reload()
  }, [accounts.reload, payments.reload])

  useRefreshOnFocus(refreshAll)

  const handleSubmit = async () => {
    setFormError(null)
    setLastPayment(null)

    const errors: Record<string, string> = {}
    const serviceNameError = requiredText(serviceName, 'El servicio', 100)
    const referenceError = requiredText(
      serviceReference,
      'La referencia del servicio',
      100,
    )

    if (!accountId) {
      errors.account = 'Selecciona la cuenta de cargo.'
    }
    if (serviceNameError) errors.serviceName = serviceNameError
    if (referenceError) errors.serviceReference = referenceError
    if (parsedAmount.error) {
      errors.amount = parsedAmount.error
    } else if (
      selectedAccount &&
      parsedAmount.value > Number(selectedAccount.balance)
    ) {
      errors.amount = `Saldo insuficiente. Disponible: ${formatMoney(
        selectedAccount.balance,
        selectedAccount.currency,
      )}.`
    }

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
      setServiceName('')
      setServiceReference('')
      setAmount('')
      setIdempotencyKey(createIdempotencyKey())
      void payments.reload()
      void accounts.reload()
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'No se pudo registrar el pago.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen
      refreshing={accounts.refreshing || payments.refreshing}
      onRefresh={refreshAll}
    >
      <ScreenHeader
        title="Pagos"
        subtitle="Paga luz, agua, internet y otros servicios desde tus cuentas."
        action={
          <IconButton
            icon="time-outline"
            label="Ver historial de pagos"
            onPress={() => navigation.navigate('History')}
          />
        }
      />

      {lastPayment ? (
        <Alert kind="success" title="Pago registrado">
          {lastPayment.serviceName} por{' '}
          {formatMoney(lastPayment.amount, lastPayment.currency)}. Referencia{' '}
          {shortenReference(lastPayment.id, 8)}
        </Alert>
      ) : null}

      {formError ? (
        <Alert kind="error" title="No se pudo registrar el pago">
          {formError}
        </Alert>
      ) : null}

      <Card title="Nuevo pago" subtitle="El cargo se aplica de inmediato">
        <SelectField
          label="Cuenta de cargo"
          value={accountId}
          options={accountOptions}
          onChange={setSelectedAccountId}
          placeholder={
            accountOptions.length === 0
              ? 'Sin cuentas disponibles'
              : 'Selecciona una cuenta'
          }
          disabled={accountOptions.length === 0}
          hint={
            selectedAccount
              ? `Saldo disponible: ${formatMoney(
                  selectedAccount.balance,
                  selectedAccount.currency,
                )}`
              : undefined
          }
          error={fieldErrors.account}
        />

        <AppText variant="label" style={styles.fieldLabel}>
          Servicios frecuentes
        </AppText>
        <View style={styles.chips}>
          {QUICK_SERVICES.map((service) => {
            const selected = serviceName === service

            return (
              <Pressable
                key={service}
                onPress={() => setServiceName(service)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="caption"
                  weight="600"
                  color={selected ? colors.primaryStrong : colors.inkSoft}
                >
                  {service}
                </AppText>
              </Pressable>
            )
          })}
        </View>

        <Input
          label="Servicio"
          value={serviceName}
          onChangeText={setServiceName}
          placeholder="Ej. Energía eléctrica"
          maxLength={100}
          error={fieldErrors.serviceName}
        />

        <Input
          label="Referencia del servicio"
          value={serviceReference}
          onChangeText={setServiceReference}
          placeholder="Ej. 123456789"
          maxLength={100}
          error={fieldErrors.serviceReference}
        />

        <Input
          label={`Monto (${currency})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          hint="Mínimo 0.01 y máximo 1,000,000.00."
          error={fieldErrors.amount}
        />

        <Button
          label={submitting ? 'Procesando…' : 'Pagar servicio'}
          onPress={() => {
            void handleSubmit()
          }}
          loading={submitting}
          disabled={accountList.length === 0}
          fullWidth
          icon="card-outline"
          testID="payment-submit"
        />

        <KeyHint value={idempotencyKey} />
      </Card>

      <Card
        title="Pagos recientes"
        subtitle={`${paymentList.length} ${
          paymentList.length === 1 ? 'registro' : 'registros'
        }`}
        style={styles.recentCard}
        actions={
          <Button
            label="Ver todo"
            variant="ghost"
            size="sm"
            onPress={() => navigation.navigate('History')}
          />
        }
      >
        <DataState
          loading={payments.loading}
          error={payments.error}
          isEmpty={paymentList.length === 0}
          emptyTitle="Sin pagos registrados"
          emptyDescription="Cuando pagues un servicio aparecerá en esta lista."
          emptyIcon="receipt-outline"
          onRetry={payments.reload}
        >
          <View>
            {paymentList.slice(0, 5).map((payment, index) => (
              <View
                key={payment.id}
                style={[
                  styles.paymentRow,
                  index < Math.min(paymentList.length, 5) - 1 &&
                    styles.paymentRowBorder,
                ]}
              >
                <View style={styles.paymentIcon}>
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.paymentBody}>
                  <AppText variant="label" weight="700" numberOfLines={1}>
                    {payment.serviceName}
                  </AppText>
                  <AppText variant="caption" numberOfLines={1}>
                    Ref. {payment.serviceReference}
                  </AppText>
                  <AppText variant="caption" style={styles.paymentDate}>
                    {formatDate(payment.createdAt)}
                  </AppText>
                </View>

                <View style={styles.paymentRight}>
                  <AppText variant="label" weight="700">
                    {formatMoney(payment.amount, payment.currency)}
                  </AppText>
                  <Badge
                    label={PAYMENT_STATUS_LABELS[payment.status]}
                    tone={statusTone(payment.status)}
                  />
                </View>
              </View>
            ))}
          </View>

          {paymentList.length > 5 ? (
            <AppText variant="caption" align="center" style={styles.moreHint}>
              Hay {paymentList.length - 5} pagos más en el historial.
            </AppText>
          ) : null}
        </DataState>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  fieldLabel: {
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: '#b7e4dc',
  },
  pressed: {
    opacity: 0.75,
  },
  recentCard: {
    marginTop: spacing.lg,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  paymentRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  paymentBody: {
    flex: 1,
    gap: 1,
  },
  paymentDate: {
    fontSize: 11,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  moreHint: {
    marginTop: spacing.md,
  },
})
