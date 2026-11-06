import * as Crypto from 'expo-crypto'

/**
 * Genera una clave única por intento de operación.
 * Se debe reutilizar la misma clave al reintentar una solicitud que falló
 * por red o timeout, para evitar movimientos duplicados.
 */
export function createIdempotencyKey(): string {
  return Crypto.randomUUID()
}
