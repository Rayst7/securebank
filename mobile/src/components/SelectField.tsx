import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, shadows, spacing } from '../theme'
import { AppText } from './AppText'

export interface SelectOption {
  value: string
  label: string
  description?: string
}

interface SelectFieldProps {
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  error?: string | null
  hint?: string | null
  disabled?: boolean
  containerStyle?: StyleProp<ViewStyle>
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opción',
  error,
  hint,
  disabled = false,
  containerStyle,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const selected = options.find((option) => option.value === value)

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>

      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityState={{ disabled, expanded: open }}
        style={({ pressed }) => [
          styles.field,
          pressed && !disabled && styles.fieldPressed,
          error ? styles.fieldError : null,
          disabled && styles.fieldDisabled,
        ]}
      >
        <AppText
          variant="body"
          color={selected ? colors.ink : colors.muted}
          numberOfLines={1}
          style={styles.value}
        >
          {selected?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.message}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" style={styles.message}>
          {hint}
        </AppText>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityLabel="Cerrar selección"
          />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHeader}>
              <AppText variant="section">{label}</AppText>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={styles.close}
              >
                <Ionicons name="close" size={22} color={colors.inkSoft} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.options}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const isSelected = option.value === value

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <View style={styles.optionText}>
                      <AppText
                        variant="body"
                        weight={isSelected ? '700' : '500'}
                        color={isSelected ? colors.primaryStrong : colors.ink}
                      >
                        {option.label}
                      </AppText>
                      {option.description ? (
                        <AppText variant="caption">{option.description}</AppText>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                )
              })}

              {options.length === 0 ? (
                <AppText variant="body" color={colors.muted} style={styles.empty}>
                  No hay opciones disponibles.
                </AppText>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 50,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  fieldPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  value: {
    flex: 1,
  },
  message: {
    marginTop: 6,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.raised,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  options: {
    flexGrow: 0,
    flexShrink: 1,
  },
  optionsContent: {
    paddingBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.xs,
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: '#b7e4dc',
  },
  optionPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  empty: {
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
})
