import { Ionicons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { AppText } from './AppText'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  action?: ReactNode
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      ) : null}

      <View style={styles.text}>
        <AppText variant="title" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="subtitle" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    flexShrink: 0,
    marginTop: 2,
  },
})
