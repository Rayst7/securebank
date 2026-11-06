import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, spacing } from '../theme'
import type { BadgeTone } from '../utils/labels'
import { AppText } from './AppText'

interface BadgeProps {
  label: string
  tone?: BadgeTone
  style?: StyleProp<ViewStyle>
}

const TONES: Record<BadgeTone, { background: string; text: string }> = {
  success: { background: colors.successSoft, text: colors.success },
  warning: { background: colors.warningSoft, text: colors.warning },
  danger: { background: colors.dangerSoft, text: colors.danger },
  info: { background: colors.infoSoft, text: colors.info },
  neutral: { background: colors.surfaceMuted, text: colors.muted },
}

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const palette = TONES[tone]

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }, style]}>
      <AppText variant="caption" color={palette.text} weight="700" style={styles.text}>
        {label}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
})
