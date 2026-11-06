import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { colors, spacing } from '../theme'
import { shortenReference } from '../utils/format'
import { AppText } from './AppText'

interface KeyHintProps {
  value: string
}

export function KeyHint({ value }: KeyHintProps) {
  return (
    <View style={styles.row}>
      <Ionicons name="key-outline" size={14} color={colors.muted} />
      <AppText variant="caption">Clave de idempotencia:</AppText>
      <AppText variant="mono" style={styles.code}>
        {shortenReference(value, 14)}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  code: {
    fontSize: 12,
  },
})
