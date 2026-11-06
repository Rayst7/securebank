import { Ionicons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { AppText } from './AppText'
import type { IconName } from './Button'

type AlertKind = 'error' | 'success' | 'info' | 'warning'

interface AlertProps {
  kind?: AlertKind
  title?: string
  children: ReactNode
}

const KINDS: Record<
  AlertKind,
  { background: string; border: string; color: string; icon: IconName }
> = {
  error: {
    background: colors.dangerSoft,
    border: '#fecdca',
    color: colors.danger,
    icon: 'alert-circle-outline',
  },
  success: {
    background: colors.successSoft,
    border: '#abefc6',
    color: colors.success,
    icon: 'checkmark-circle-outline',
  },
  info: {
    background: colors.infoSoft,
    border: '#b2ddff',
    color: colors.info,
    icon: 'information-circle-outline',
  },
  warning: {
    background: colors.warningSoft,
    border: '#fedf89',
    color: colors.warning,
    icon: 'warning-outline',
  },
}

export function Alert({ kind = 'info', title, children }: AlertProps) {
  const palette = KINDS[kind]

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.alert,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <Ionicons name={palette.icon} size={20} color={palette.color} />
      <View style={styles.content}>
        {title ? (
          <AppText variant="label" color={palette.color} weight="700">
            {title}
          </AppText>
        ) : null}
        <AppText variant="body" color={colors.inkSoft} style={styles.body}>
          {children}
        </AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
})
