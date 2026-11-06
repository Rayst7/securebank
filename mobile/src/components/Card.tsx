import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, shadows, spacing } from '../theme'
import { AppText } from './AppText'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  style?: StyleProp<ViewStyle>
  padded?: boolean
}

export function Card({
  children,
  title,
  subtitle,
  actions,
  style,
  padded = true,
}: CardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {title || actions ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <AppText variant="section">{title}</AppText> : null}
            {subtitle ? (
              <AppText variant="caption" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  actions: {
    flexShrink: 0,
  },
})
