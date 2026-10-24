import { Ionicons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { colors, spacing } from '../theme'
import { AppText } from './AppText'
import { Button } from './Button'

interface DataStateProps {
  loading: boolean
  error: string | null
  isEmpty: boolean
  emptyTitle: string
  emptyDescription?: string
  emptyIcon?: keyof typeof Ionicons.glyphMap
  onRetry?: () => void
  children: ReactNode
}

export function DataState({
  loading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyIcon = 'file-tray-outline',
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="small" color={colors.primary} />
        <AppText variant="caption">Cargando información…</AppText>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.state}>
        <View style={[styles.icon, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="cloud-offline-outline" size={26} color={colors.danger} />
        </View>
        <AppText variant="section" align="center">
          No se pudo cargar
        </AppText>
        <AppText variant="caption" align="center" style={styles.description}>
          {error}
        </AppText>
        {onRetry ? (
          <Button
            label="Reintentar"
            variant="secondary"
            size="sm"
            icon="refresh"
            onPress={onRetry}
            style={styles.retry}
          />
        ) : null}
      </View>
    )
  }

  if (isEmpty) {
    return (
      <View style={styles.state}>
        <View style={styles.icon}>
          <Ionicons name={emptyIcon} size={26} color={colors.primary} />
        </View>
        <AppText variant="section" align="center">
          {emptyTitle}
        </AppText>
        {emptyDescription ? (
          <AppText variant="caption" align="center" style={styles.description}>
            {emptyDescription}
          </AppText>
        ) : null}
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl + spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.xs,
  },
  description: {
    maxWidth: 280,
  },
  retry: {
    marginTop: spacing.sm,
  },
})
