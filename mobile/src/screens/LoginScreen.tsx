import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInputInstance,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Alert } from '../components/Alert'
import { AppText } from '../components/AppText'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { colors, radius, spacing } from '../theme'
import { isEmail } from '../utils/validation'

export function LoginScreen() {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const passwordRef = useRef<TextInputInstance>(null)

  const handleSubmit = async () => {
    setError(null)

    if (!isEmail(email)) {
      setError('Ingresa un correo electrónico válido.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setSubmitting(true)

    try {
      await login(email.trim(), password)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.brand}>
              <View style={styles.mark}>
                <Ionicons
                  name="shield-checkmark"
                  size={22}
                  color={colors.white}
                />
              </View>
              <AppText variant="section" color={colors.white} weight="800">
                SecureBank
              </AppText>
            </View>

            <AppText variant="hero" color={colors.white} style={styles.headline}>
              Tu banco,{'\n'}en la palma de tu mano.
            </AppText>
            <AppText variant="body" color="#b8c7d9" style={styles.lead}>
              Consulta saldos, transfiere y paga servicios de forma segura.
            </AppText>
          </View>

          <View style={styles.sheet}>
            <AppText variant="title">Inicia sesión</AppText>
            <AppText variant="subtitle" style={styles.subtitle}>
              Accede con tu cuenta de SecureBank para continuar.
            </AppText>

            {error ? (
              <Alert kind="error" title="No se pudo iniciar sesión">
                {error}
              </Alert>
            ) : null}

            <Input
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="login-email"
            />

            <Input
              ref={passwordRef}
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => {
                void handleSubmit()
              }}
              testID="login-password"
            />

            <Button
              label={submitting ? 'Ingresando…' : 'Ingresar'}
              onPress={() => {
                void handleSubmit()
              }}
              loading={submitting}
              fullWidth
              icon="log-in-outline"
              testID="login-submit"
            />

            {__DEV__ ? (
              <View style={styles.devHint}>
                <View style={styles.devTitle}>
                  <Ionicons
                    name="flask-outline"
                    size={15}
                    color={colors.inkSoft}
                  />
                  <AppText variant="label" weight="700">
                    Credenciales de prueba
                  </AppText>
                </View>
                <AppText variant="caption">
                  cliente@securebank.test · ClienteDemo2026!
                </AppText>
                <AppText variant="caption">
                  destino.transfer.test@securebank.test · DestinoDemo2026!
                </AppText>
              </View>
            ) : null}

            <AppText variant="caption" align="center" style={styles.footer}>
              SecureBank · Banca digital segura
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  headline: {
    fontSize: 32,
    lineHeight: 38,
  },
  lead: {
    maxWidth: 320,
    color: '#b8c7d9',
  },
  sheet: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  devHint: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  devTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 2,
  },
  footer: {
    marginTop: spacing.xl,
  },
})
