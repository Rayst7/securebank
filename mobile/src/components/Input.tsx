import { Ionicons } from '@expo/vector-icons'
import { forwardRef, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
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

export const Input = forwardRef<TextInputInstance, InputProps>(function Input(
  {
    label,
    error,
    hint,
    containerStyle,
    secureTextEntry,
    multiline,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(Boolean(secureTextEntry))

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>

      {/*
        collapsable={false} evita que Fabric elimine y vuelva a crear este
        contenedor al cambiar de estilo con el foco. Sin esto, el TextInput
        pierde el foco y el teclado se cierra al instante (RN #45798).
        Por la misma razón, el estado de foco solo cambia el borde: no se
        deben aplicar sombras, elevación, opacidad ni transform aquí.
      */}
      <View
        collapsable={false}
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        <TextInput
          {...rest}
          ref={ref}
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
})

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
    backgroundColor: colors.primarySoft,
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
