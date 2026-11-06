import type { ViewStyle } from 'react-native'

export const colors = {
  bg: '#f2f5f9',
  surface: '#ffffff',
  surfaceMuted: '#f7f9fc',
  ink: '#0b1526',
  inkSoft: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  primary: '#0f766e',
  primaryStrong: '#0b5d57',
  primarySoft: '#e6f4f1',
  navy: '#0b1f33',
  navySoft: '#122b45',
  danger: '#b42318',
  dangerSoft: '#fef3f2',
  success: '#067647',
  successSoft: '#ecfdf3',
  warning: '#b54708',
  warningSoft: '#fffaeb',
  info: '#175cd3',
  infoSoft: '#eff8ff',
  white: '#ffffff',
  overlay: 'rgba(11, 21, 38, 0.55)',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const

export const shadows: Record<'card' | 'raised', ViewStyle> = {
  card: {
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#101828',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
}
