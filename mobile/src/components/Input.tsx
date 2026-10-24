import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { colors, radius, spacing } from '../theme'
import { AppText } from './AppText'

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string
  error?: string | null
  hint?: string | null
  containerStyle?: StyleProp<ViewStyle>
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  secureTextEntry,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(Boolean(secureTextEntry))

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>

      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={secureTextEntry ? hidden : false}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            secureTextEntry && styles.inputWithAccessory,
          ]}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((current) => !current)}
            style={styles.accessory}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.message}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" style={styles.message}>
          {hint}
        </AppText>
      ) : null}
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
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  fieldMultiline: {
    minHeight: 96,
    alignItems: 'flex-start',
  },
  fieldFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink,
  },
  inputMultiline: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  inputWithAccessory: {
    paddingRight: 44,
  },
  accessory: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    width: 28,
    alignItems: 'center',
  },
  message: {
    marginTop: 6,
  },
})
