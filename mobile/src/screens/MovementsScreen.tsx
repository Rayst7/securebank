import { Ionicons } from '@expo/vector-icons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '../components/AppText'
import type { IconName } from '../components/Button'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { IconButton } from '../components/IconButton'
import { Screen } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { SelectField } from '../components/SelectField'
import { useApiQuery } from '../hooks/useApiQuery'
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus'
import type { MainTabParamList } from '../navigation/types'
import { accountsService } from '../services/accounts.service'
import { colors, radius, spacing } from '../theme'
import type { TransactionType } from '../types/transaction'
import {
  formatDate,
  formatMoney,
  formatSignedAmount,
  isCreditTransaction,
} from '../utils/format'
import { TRANSACTION_TYPE_LABELS } from '../utils/labels'

type Props = BottomTabScreenProps<MainTabParamList, 'Movements'>

function transactionIcon(
  type: TransactionType,
  isCredit: boolean,
): IconName {
  if (type === 'PAYMENT') return 'card-outline'
  if (type === 'DEPOSIT') return 'arrow-down-outline'
  return isCredit ? 'arrow-down-outline' : 'arrow-up-outline'
}

export function MovementsScreen({ route }: Props) {
  const accounts = useApiQuery(() => accountsService.list(), [])
  const requestedAccountId = route.params?.accountId
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (requestedAccountId) {
      setSelectedId(requestedAccountId)
    }
  }, [requestedAccountId])

  const accountList = accounts.data ?? []
  const candidate = selectedId ?? requestedAccountId ?? ''
  const accountId = accountList.some((account) => account.id === candidate)
    ? candidate
    : (accountList[0]?.id ?? '')

  const transactions = useApiQuery(
    () =>
      accountId
        ? accountsService.transactions(accountId)
        : Promise.resolve([]),
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
    label: account.accountNumber,
    description: `${formatMoney(account.balance, account.currency)} · ${account.currency}`,
  }))

  const refreshAll = useCallback(() => {
    void accounts.reload()
    void transactions.reload()
  }, [accounts.reload, transactions.reload])

  useRefreshOnFocus(refreshAll)

  return (
    <Screen
      refreshing={accounts.refreshing || transactions.refreshing}
      onRefresh={refreshAll}
    >
      <ScreenHeader
        title="Movimientos"
        subtitle="Consulta los cargos y abonos de cada cuenta."
        action={
          <IconButton
            icon="refresh"
            label="Actualizar movimientos"
            onPress={refreshAll}
            disabled={accounts.loading || transactions.loading}
          />
        }
      />

      <Card padded={false}>
        <View style={styles.body}>
          <SelectField
            label="Cuenta"
            value={accountId}
            options={accountOptions}
            onChange={setSelectedId}
            placeholder={
              accountOptions.length === 0
                ? 'Sin cuentas disponibles'
                : 'Selecciona una cuenta'
            }
            disabled={accountOptions.length === 0}
            containerStyle={styles.select}
          />

          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <AppText variant="caption">Ingresos</AppText>
              <AppText
                variant="label"
                color={colors.success}
                weight="700"
                numberOfLines={1}
              >
                {formatMoney(credits, currency)}
              </AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AppText variant="caption">Egresos</AppText>
              <AppText variant="label" weight="700" numberOfLines={1}>
                {formatMoney(debits, currency)}
              </AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AppText variant="caption">Movimientos</AppText>
              <AppText variant="label" weight="700">
                {items.length}
              </AppText>
            </View>
          </View>

          <DataState
            loading={accounts.loading || transactions.loading}
            error={transactions.error ?? accounts.error}
            isEmpty={items.length === 0}
            emptyTitle="Sin movimientos"
            emptyDescription="Esta cuenta todavía no registra cargos ni abonos."
            emptyIcon="receipt-outline"
            onRetry={refreshAll}
          >
            <View>
              {items.map((transaction, index) => {
                const credit = isCreditTransaction(transaction.type)
                const icon = transactionIcon(transaction.type, credit)
                const typeLabel = TRANSACTION_TYPE_LABELS[transaction.type]
                const description = transaction.description?.trim()
                const showDescription = Boolean(
                  description && description !== typeLabel,
                )

                return (
                  <View
                    key={transaction.id}
                    style={[
                      styles.txRow,
                      index < items.length - 1 && styles.txRowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.txIcon,
                        {
                          backgroundColor: credit
                            ? colors.successSoft
                            : colors.dangerSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name={icon}
                        size={18}
                        color={credit ? colors.success : colors.danger}
                      />
                    </View>

                    <View style={styles.txBody}>
                      <AppText variant="label" weight="700" numberOfLines={1}>
                        {typeLabel}
                      </AppText>
                      {showDescription ? (
                        <AppText variant="caption" numberOfLines={1}>
                          {description}
                        </AppText>
                      ) : null}
                      <AppText variant="caption" style={styles.txDate}>
                        {formatDate(transaction.createdAt)}
                      </AppText>
                    </View>

                    <AppText
                      variant="label"
                      weight="700"
                      color={credit ? colors.success : colors.danger}
                      style={styles.txAmount}
                    >
                      {formatSignedAmount(
                        transaction.amount,
                        transaction.currency,
                        credit,
                      )}
                    </AppText>
                  </View>
                )
              })}
            </View>
          </DataState>
        </View>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
  },
  select: {
    marginBottom: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.line,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  txRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: {
    flex: 1,
    gap: 1,
  },
  txDate: {
    fontSize: 11,
  },
  txAmount: {
    fontSize: 13,
    flexShrink: 0,
  },
})
