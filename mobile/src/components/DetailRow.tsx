import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors, spacing } from '../theme'
import { AppText } from './AppText'

interface DetailRowProps {
  label: string
  children: ReactNode
}

export function DetailRow({ label, children }: DetailRowProps) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.value}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  label: {
    flexShrink: 0,
    paddingTop: 1,
  },
  value: {
    flex: 1,
    alignItems: 'flex-end',
  },
})
