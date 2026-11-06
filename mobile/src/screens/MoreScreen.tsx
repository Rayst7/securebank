import { Ionicons } from '@expo/vector-icons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '../components/AppText'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { Button, type IconName } from '../components/Button'
import { Card } from '../components/Card'
import { Screen } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { useAuth } from '../hooks/useAuth'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import { API_BASE_URL } from '../services/api'
import { colors, radius, spacing } from '../theme'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'More'>,
  NativeStackScreenProps<RootStackParamList, 'App'>
>

interface MenuRowProps {
  icon: IconName
  title: string
  subtitle?: string
  onPress: () => void
  danger?: boolean
}

function MenuRow({ icon, title, subtitle, onPress, danger }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={19}
          color={danger ? colors.danger : colors.primary}
        />
      </View>
      <View style={styles.menuText}>
        <AppText
          variant="label"
          weight="700"
          color={danger ? colors.danger : colors.ink}
        >
          {title}
        </AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  )
}

export function MoreScreen({ navigation }: Props) {
  const { user, logout } = useAuth()

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Cliente'
  const roleLabel = user?.role === 'ADMIN' ? 'Administrador' : 'Cliente'

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      const confirmFn = (
        globalThis as { confirm?: (message: string) => boolean }
      ).confirm

      if (confirmFn?.('¿Seguro que quieres salir de SecureBank?')) {
        void logout()
      }
      return
    }

    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir de SecureBank?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            void logout()
          },
        },
      ],
    )
  }

  const showAbout = () => {
    const message = `Versión 1.0.0\n\nAplicación móvil de banca digital para consultar cuentas, transferir y pagar servicios.\n\nAPI: ${API_BASE_URL}`

    if (Platform.OS === 'web') {
      const alertFn = (globalThis as { alert?: (text: string) => void }).alert
      alertFn?.(`SecureBank\n\n${message}`)
      return
    }

    Alert.alert('SecureBank', message)
  }

  return (
    <Screen>
      <ScreenHeader
        title="Más"
        subtitle="Tu cuenta y opciones adicionales."
      />

      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Avatar
            firstName={user?.firstName ?? 'Cliente'}
            lastName={user?.lastName ?? 'SecureBank'}
            size={58}
          />
          <View style={styles.profileText}>
            <AppText variant="section" numberOfLines={1}>
              {fullName}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {user?.email ?? '—'}
            </AppText>
            <View style={styles.profileBadges}>
              <Badge label={roleLabel} tone="info" />
              <Badge label="Sesión activa" tone="success" />
            </View>
          </View>
        </View>
      </Card>

      <Card padded={false} style={styles.menuCard}>
        <MenuRow
          icon="people-outline"
          title="Beneficiarios"
          subtitle="Guarda y consulta tus cuentas frecuentes"
          onPress={() => navigation.navigate('Beneficiaries')}
        />
        <View style={styles.separator} />
        <MenuRow
          icon="time-outline"
          title="Historial"
          subtitle="Transferencias y pagos realizados"
          onPress={() => navigation.navigate('History')}
        />
        <View style={styles.separator} />
        <MenuRow
          icon="information-circle-outline"
          title="Acerca de SecureBank"
          subtitle="Versión e información de la API"
          onPress={showAbout}
        />
      </Card>

      <Card title="Seguridad" subtitle="Tu sesión está protegida">
        <View style={styles.securityRow}>
          <View style={styles.securityIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <AppText variant="caption" style={styles.securityText}>
            El token de acceso se guarda en el almacenamiento seguro del
            dispositivo. Si la sesión expira, la app te pedirá iniciar sesión
            nuevamente.
          </AppText>
        </View>

        <Button
          label="Cerrar sesión"
          variant="danger"
          icon="log-out-outline"
          fullWidth
          onPress={confirmLogout}
        />
      </Card>

      {__DEV__ ? (
        <Card title="Entorno de desarrollo" style={styles.devCard}>
          <AppText variant="caption">API configurada</AppText>
          <AppText variant="mono" style={styles.apiUrl}>
            {API_BASE_URL}
          </AppText>
          <AppText variant="caption" style={styles.devHint}>
            Si usas un teléfono físico, la computadora y el teléfono deben estar
            en la misma red. Puedes forzar la URL con EXPO_PUBLIC_API_URL.
          </AppText>
        </Card>
      ) : null}

      <AppText variant="caption" align="center" style={styles.footer}>
        SecureBank · Versión 1.0.0
      </AppText>
    </Screen>
  )
}

const styles = StyleSheet.create({
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  menuCard: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  menuIconDanger: {
    backgroundColor: colors.dangerSoft,
  },
  menuText: {
    flex: 1,
    gap: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginLeft: spacing.lg + 38 + spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  devCard: {
    marginTop: spacing.lg,
  },
  apiUrl: {
    marginTop: spacing.xs,
    fontSize: 12,
  },
  devHint: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
  },
})
