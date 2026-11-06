import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native'
import { colors } from '../theme'

type Variant =
  | 'display'
  | 'hero'
  | 'title'
  | 'subtitle'
  | 'section'
  | 'body'
  | 'label'
  | 'caption'
  | 'amount'
  | 'mono'

interface AppTextProps extends TextProps {
  variant?: Variant
  color?: string
  align?: TextStyle['textAlign']
  weight?: TextStyle['fontWeight']
}

export function AppText({
  variant = 'body',
  color,
  align,
  weight,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        color ? { color } : null,
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    />
  )
}

const styles = StyleSheet.create({
  base: {
    color: colors.ink,
  },
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  hero: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
  },
  section: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  amount: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  mono: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'monospace',
    color: colors.inkSoft,
  },
})
