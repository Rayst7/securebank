import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { colors, radius, spacing } from '../theme'
import { AppText } from './AppText'

export type IconName = ComponentProps<typeof Ionicons>['name']

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'sm'

interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: IconName
  rightIcon?: IconName
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  testID?: string
}

const VARIANT_STYLES: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#fecdca',
  },
}

const TEXT_COLORS: Record<ButtonVariant, string> = {
  primary: colors.white,
  secondary: colors.ink,
  ghost: colors.primaryStrong,
  danger: colors.danger,
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  rightIcon,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading
  const iconColor = TEXT_COLORS[variant]
  const iconSize = size === 'sm' ? 16 : 18

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        VARIANT_STYLES[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={iconSize} color={iconColor} /> : null}
          <AppText
            variant="label"
            color={iconColor}
            weight="700"
            style={size === 'sm' ? styles.textSm : styles.text}
            numberOfLines={1}
          >
            {label}
          </AppText>
          {rightIcon ? (
            <Ionicons name={rightIcon} size={iconSize} color={iconColor} />
          ) : null}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  md: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sm: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.55,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    fontSize: 15,
  },
  textSm: {
    fontSize: 13,
  },
})
