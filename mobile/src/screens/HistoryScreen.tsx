import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '../components/AppText'
import { Badge } from '../components/Badge'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { IconButton } from '../components/IconButton'
import { Input } from '../components/Input'
import { Screen } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { SegmentedControl } from '../components/SegmentedControl'
import { SelectField } from '../components/SelectField'
import { useApiQuery } from '../hooks/useApiQuery'
import type { RootStackParamList } from '../navigation/types'
import { paymentsService } from '../services/payments.service'
import { transfersService } from '../services/transfers.service'
import { colors, radius, spacing } from '../theme'
import { formatDate, formatMoney, shortenReference } from '../utils/format'
import {
  PAYMENT_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
  statusTone,
} from '../utils/labels'

type Props = NativeStackScreenProps<RootStackParamList, 'History'>

type HistoryTab = 'transfers' | 'payments'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'COMPLETED', label: 'Completados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'FAILED', label: 'Fallidos' },
]

export function HistoryScreen({ navigation }: Props) {
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

  const refreshAll = useCallback(() => {
    void transfers.reload()
    void payments.reload()
  }, [transfers.reload, payments.reload])

  const activeLoading = tab === 'transfers' ? transfers.loading : payments.loading
  const activeError = tab === 'transfers' ? transfers.error : payments.error
  const activeEmpty =
    tab === 'transfers'
      ? filteredTransfers.length === 0
      : filteredPayments.length === 0

  return (
    <Screen
      refreshing={transfers.refreshing || payments.refreshing}
      onRefresh={refreshAll}
    >
      <ScreenHeader
        title="Historial"
        subtitle="Consulta todas tus transferencias y pagos registrados."
        onBack={() => navigation.goBack()}
        action={
          <IconButton
            icon="refresh"
            label="Actualizar historial"
            onPress={refreshAll}
            disabled={transfers.loading || payments.loading}
          />
        }
      />

      <SegmentedControl
        options={[
          {
            value: 'transfers',
            label: `Transferencias (${transferList.length})`,
          },
          { value: 'payments', label: `Pagos (${paymentList.length})` },
        ]}
        value={tab}
        onChange={setTab}
        accessibilityLabel="Tipo de operación"
      />

      <Card>
        <Input
          label="Buscar"
          value={search}
          onChangeText={setSearch}
          placeholder="Referencia, cuenta o servicio"
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.search}
        />

        <SelectField
          label="Estado"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
          containerStyle={styles.status}
        />

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
          emptyIcon="time-outline"
          onRetry={refreshAll}
        >
          {tab === 'transfers' ? (
            <View>
              {filteredTransfers.map((transfer, index) => (
                <View
                  key={transfer.id}
                  style={[
                    styles.row,
                    index < filteredTransfers.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.rowTop}>
                    <View style={styles.rowTitle}>
                      <AppText variant="label" weight="700">
                        Transferencia
                      </AppText>
                      <AppText variant="caption">
                        {formatDate(transfer.createdAt)}
                      </AppText>
                    </View>
                    <View style={styles.rowRight}>
                      <AppText variant="label" weight="700">
                        {formatMoney(transfer.amount, transfer.currency)}
                      </AppText>
                      <Badge
                        label={TRANSFER_STATUS_LABELS[transfer.status]}
                        tone={statusTone(transfer.status)}
                      />
                    </View>
                  </View>

                  <View style={styles.route}>
                    <AppText variant="mono" style={styles.account}>
                      {transfer.sourceAccount}
                    </AppText>
                    <Ionicons
                      name="arrow-forward"
                      size={13}
                      color={colors.muted}
                    />
                    <AppText variant="mono" style={styles.account}>
                      {transfer.destinationAccount}
                    </AppText>
                  </View>

                  <AppText variant="caption">
                    Ref. {shortenReference(transfer.reference, 14)}
                  </AppText>
                  {transfer.description ? (
                    <AppText variant="caption" numberOfLines={1}>
                      {transfer.description}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View>
              {filteredPayments.map((payment, index) => (
                <View
                  key={payment.id}
                  style={[
                    styles.row,
                    index < filteredPayments.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.rowTop}>
                    <View style={styles.rowTitle}>
                      <AppText variant="label" weight="700" numberOfLines={1}>
                        {payment.serviceName}
                      </AppText>
                      <AppText variant="caption">
                        {formatDate(payment.createdAt)}
                      </AppText>
                    </View>
                    <View style={styles.rowRight}>
                      <AppText variant="label" weight="700">
                        {formatMoney(payment.amount, payment.currency)}
                      </AppText>
                      <Badge
                        label={PAYMENT_STATUS_LABELS[payment.status]}
                        tone={statusTone(payment.status)}
                      />
                    </View>
                  </View>

                  <AppText variant="caption">
                    Ref. {payment.serviceReference}
                  </AppText>
                  <AppText variant="caption">
                    ID {shortenReference(payment.id, 14)}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </DataState>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  search: {
    marginBottom: spacing.md,
  },
  status: {
    marginBottom: spacing.md,
  },
  row: {
    paddingVertical: spacing.md,
    gap: 4,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowTitle: {
    flex: 1,
    gap: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    marginTop: 2,
  },
  account: {
    fontSize: 12,
  },
})
