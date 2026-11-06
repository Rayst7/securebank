import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Alert } from '../components/Alert'
import { AppText } from '../components/AppText'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DataState } from '../components/DataState'
import { Input } from '../components/Input'
import { Screen } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { useApiQuery } from '../hooks/useApiQuery'
import type { RootStackParamList } from '../navigation/types'
import { beneficiariesService } from '../services/beneficiaries.service'
import { colors, radius, spacing } from '../theme'
import { formatDate } from '../utils/format'
import { accountNumberError, requiredText } from '../utils/validation'

type Props = NativeStackScreenProps<RootStackParamList, 'Beneficiaries'>

export function BeneficiariesScreen({ navigation }: Props) {
  const beneficiaries = useApiQuery(() => beneficiariesService.list(), [])

  const [showForm, setShowForm] = useState(false)
  const [alias, setAlias] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('SecureBank')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const closeForm = () => {
    setShowForm(false)
    setAlias('')
    setAccountNumber('')
    setBankName('SecureBank')
    setFieldErrors({})
    setFormError(null)
  }

  const handleSubmit = async () => {
    setFormError(null)

    const errors: Record<string, string> = {}
    const aliasError = requiredText(alias, 'El alias', 100)
    const accountError = accountNumberError(accountNumber)
    const bankError = requiredText(bankName, 'El banco', 100)

    if (aliasError) errors.alias = aliasError
    if (accountError) errors.accountNumber = accountError
    if (bankError) errors.bankName = bankError

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      const created = await beneficiariesService.create({
        alias: alias.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
      })

      setSuccess(
        `Beneficiario "${created.alias}" registrado con la cuenta ${created.accountNumber}.`,
      )
      closeForm()
      void beneficiaries.reload()
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo registrar el beneficiario.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const list = beneficiaries.data ?? []

  return (
    <Screen
      refreshing={beneficiaries.refreshing}
      onRefresh={beneficiaries.reload}
    >
      <ScreenHeader
        title="Beneficiarios"
        subtitle="Guarda las cuentas que usas con frecuencia."
        onBack={() => navigation.goBack()}
        action={
          <Button
            label={showForm ? 'Cancelar' : 'Agregar'}
            variant={showForm ? 'ghost' : 'primary'}
            size="sm"
            icon={showForm ? 'close' : 'add'}
            onPress={() => {
              if (showForm) {
                closeForm()
              } else {
                setSuccess(null)
                setShowForm(true)
              }
            }}
          />
        }
      />

      {success ? (
        <Alert kind="success" title="Beneficiario guardado">
          {success}
        </Alert>
      ) : null}

      {showForm ? (
        <Card
          title="Nuevo beneficiario"
          subtitle="Todos los campos son obligatorios"
          style={styles.formCard}
        >
          {formError ? (
            <Alert kind="error" title="No se pudo guardar">
              {formError}
            </Alert>
          ) : null}

          <Input
            label="Alias"
            value={alias}
            onChangeText={setAlias}
            placeholder="Ej. Mamá, Renta, Universidad"
            maxLength={100}
            error={fieldErrors.alias}
          />

          <Input
            label="Número de cuenta"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="SB-10000002"
            maxLength={30}
            autoCapitalize="characters"
            autoCorrect={false}
            hint="Solo letras, números y guiones."
            error={fieldErrors.accountNumber}
          />

          <Input
            label="Banco"
            value={bankName}
            onChangeText={setBankName}
            placeholder="SecureBank"
            maxLength={100}
            error={fieldErrors.bankName}
          />

          <Button
            label={submitting ? 'Guardando…' : 'Guardar beneficiario'}
            onPress={() => {
              void handleSubmit()
            }}
            loading={submitting}
            fullWidth
            icon="person-add-outline"
          />
        </Card>
      ) : null}

      <Card
        title="Mis beneficiarios"
        subtitle={`${list.length} ${
          list.length === 1 ? 'registrado' : 'registrados'
        }`}
        style={showForm ? styles.listCard : undefined}
      >
        <DataState
          loading={beneficiaries.loading}
          error={beneficiaries.error}
          isEmpty={list.length === 0}
          emptyTitle="Todavía no tienes beneficiarios"
          emptyDescription="Usa el botón Agregar para guardar el primero."
          emptyIcon="people-outline"
          onRetry={beneficiaries.reload}
        >
          <View>
            {list.map((beneficiary, index) => (
              <View
                key={beneficiary.id}
                style={[
                  styles.row,
                  index < list.length - 1 && styles.rowBorder,
                ]}
              >
                <View style={styles.avatar}>
                  <AppText
                    variant="label"
                    color={colors.primaryStrong}
                    weight="800"
                  >
                    {beneficiary.alias.charAt(0).toUpperCase()}
                  </AppText>
                </View>

                <View style={styles.body}>
                  <AppText variant="label" weight="700" numberOfLines={1}>
                    {beneficiary.alias}
                  </AppText>
                  <AppText variant="caption">{beneficiary.bankName}</AppText>
                  <View style={styles.accountRow}>
                    <Ionicons
                      name="card-outline"
                      size={13}
                      color={colors.muted}
                    />
                    <AppText variant="mono" style={styles.account}>
                      {beneficiary.accountNumber}
                    </AppText>
                  </View>
                </View>

                <AppText variant="caption" style={styles.date}>
                  {formatDate(beneficiary.createdAt)}
                </AppText>
              </View>
            ))}
          </View>
        </DataState>
      </Card>

      <Alert kind="info" title="Sobre las transferencias">
        El número de cuenta se guarda como referencia. Para transferir a otra
        persona, la API todavía exige el UUID de la cuenta destino.
      </Alert>
    </Screen>
  )
}

const styles = StyleSheet.create({
  formCard: {
    marginBottom: spacing.lg,
  },
  listCard: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#b7e4dc',
  },
  body: {
    flex: 1,
    gap: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  account: {
    fontSize: 12,
  },
  date: {
    flexShrink: 0,
    maxWidth: 92,
    textAlign: 'right',
    fontSize: 11,
  },
})
