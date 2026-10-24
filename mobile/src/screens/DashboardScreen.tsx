import { Ionicons } from '@expo/vector-icons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '../components/AppText'
import { Badge } from '../components/Badge'
import type { IconName } from '../components/Button'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { Screen } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { useApiQuery } from '../hooks/useApiQuery'
import { useAuth } from '../hooks/useAuth'
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import { accountsService } from '../services/accounts.service'
import { colors, radius, spacing } from '../theme'
import { formatAccountNumber, formatMoney } from '../utils/format'
import { ACCOUNT_STATUS_LABELS, statusTone } from '../utils/labels'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList, 'App'>
>

interface QuickAction {
  label: string
  icon: IconName
  onPress: () => void
}

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth()
  const accounts = useApiQuery(() => accountsService.list(), [])

  useRefreshOnFocus(accounts.reload)

  const list = accounts.data ?? []
  const activeAccounts = list.filter((account) => account.status === 'ACTIVE')
  const currency = list[0]?.currency ?? 'GTQ'
  const totalBalance = list.reduce(
    (total, account) => total + Number(account.balance),
    0,
  )

  const quickActions: QuickAction[] = [
    {
      label: 'Transferir',
      icon: 'paper-plane-outline',
      onPress: () => navigation.navigate('Transfer'),
    },
    {
      label: 'Pagar servicio',
      icon: 'card-outline',
      onPress: () => navigation.navigate('Payments'),
    },
    {
      label: 'Beneficiarios',
      icon: 'people-outline',
      onPress: () => navigation.navigate('Beneficiaries'),
    },
    {
      label: 'Historial',
      icon: 'time-outline',
      onPress: () => navigation.navigate('History'),
    },
  ]

  return (
    <Screen refreshing={accounts.refreshing} onRefresh={accounts.reload}>
      <ScreenHeader
        title={`Hola, ${user?.firstName ?? 'cliente'}`}
        subtitle="Este es el resumen de tus cuentas en SecureBank."
      />

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <AppText variant="caption" color="#9fb3c8" weight="700">
            SALDO TOTAL
          </AppText>
          <View style={styles.heroIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#9ad9cd"
            />
          </View>
        </View>

        <AppText variant="hero" color={colors.white} style={styles.heroAmount}>
          {formatMoney(totalBalance, currency)}
        </AppText>
        <AppText variant="caption" color="#9fb3c8">
          Suma de todas tus cuentas
        </AppText>

        <View style={styles.heroFooter}>
          <View style={styles.heroStat}>
            <AppText variant="caption" color="#9fb3c8">
              Cuentas activas
            </AppText>
            <AppText variant="label" color={colors.white} weight="700">
              {activeAccounts.length} de {list.length}
            </AppText>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <AppText variant="caption" color="#9fb3c8">
              Moneda principal
            </AppText>
            <AppText variant="label" color={colors.white} weight="700">
              {currency}
            </AppText>
          </View>
          <View style={styles.heroTag}>
            <Ionicons name="lock-closed" size={12} color="#9ad9cd" />
            <AppText variant="caption" color="#9ad9cd" weight="600">
              Protegido
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [
              styles.quickAction,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.quickIcon}>
              <Ionicons name={action.icon} size={21} color={colors.primary} />
            </View>
            <AppText variant="label" weight="700" numberOfLines={1}>
              {action.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="section">Mis cuentas</AppText>
        <AppText variant="caption">
          {list.length} {list.length === 1 ? 'cuenta' : 'cuentas'}
        </AppText>
      </View>

      <Card padded={false} style={styles.accountsCard}>
        <View style={styles.accountsContent}>
          <DataState
            loading={accounts.loading}
            error={accounts.error}
            isEmpty={list.length === 0}
            emptyTitle="Aún no tienes cuentas"
            emptyDescription="Cuando el banco te asigne una cuenta aparecerá aquí."
            emptyIcon="wallet-outline"
            onRetry={accounts.reload}
          >
            {list.map((account) => (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountTop}>
                  <AppText variant="mono" weight="700" style={styles.accountNumber}>
                    {formatAccountNumber(account.accountNumber)}
                  </AppText>
                  <Badge
                    label={ACCOUNT_STATUS_LABELS[account.status]}
                    tone={statusTone(account.status)}
                  />
                </View>

                <AppText variant="amount" style={styles.accountBalance}>
                  {formatMoney(account.balance, account.currency)}
                </AppText>
                <AppText variant="caption">
                  Cuenta en {account.currency} · ID {account.id.slice(0, 8)}…
                </AppText>

                <Pressable
                  onPress={() =>
                    navigation.navigate('Movements', { accountId: account.id })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Ver movimientos de ${account.accountNumber}`}
                  style={({ pressed }) => [
                    styles.accountLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText
                    variant="label"
                    color={colors.primaryStrong}
                    weight="700"
                  >
                    Ver movimientos
                  </AppText>
                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={colors.primaryStrong}
                  />
                </Pressable>
              </View>
            ))}
          </DataState>
        </View>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  heroIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroAmount: {
    fontSize: 38,
    lineHeight: 44,
    marginTop: spacing.xs,
  },
  heroFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroStat: {
    gap: 1,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
    backgroundColor: 'rgba(154, 217, 205, 0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickAction: {
    flexGrow: 1,
    flexBasis: '44%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md + 2,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.75,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  accountsCard: {
    overflow: 'hidden',
  },
  accountsContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  accountCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  accountNumber: {
    fontSize: 14,
  },
  accountBalance: {
    fontSize: 26,
    lineHeight: 32,
  },
  accountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
})
