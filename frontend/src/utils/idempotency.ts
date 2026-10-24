/**
 * Genera una clave única por intento de operación.
 * Se debe reutilizar la misma clave al reintentar una solicitud que falló
 * por red o timeout, para evitar movimientos duplicados.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `sb-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}
