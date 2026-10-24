import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../hooks/useAuth'

interface LocationState {
  from?: string
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Ingresa tu correo electrónico.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setSubmitting(true)

    try {
      await login(email.trim(), password)
      const state = location.state as LocationState | null
      navigate(state?.from ?? '/dashboard', { replace: true })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <p className="eyebrow">Bienvenido de nuevo</p>
      <h1>Inicia sesión</h1>
      <p className="login-subtitle">
        Accede con tu cuenta de SecureBank para continuar.
      </p>

      {error && (
        <Alert kind="error" title="No se pudo iniciar sesión">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          data-testid="login-email"
        />

        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          data-testid="login-password"
        />

        <Button
          type="submit"
          fullWidth
          loading={submitting}
          data-testid="login-submit"
        >
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="dev-hint">
          <strong>Credenciales de prueba (desarrollo)</strong>
          <p>cliente@securebank.test · ClienteDemo2026!</p>
          <p>destino.transfer.test@securebank.test · DestinoDemo2026!</p>
        </div>
      )}

      <p className="login-foot">
        ¿Problemas para ingresar? Contacta al administrador del sistema.
      </p>
    </div>
  )
}
