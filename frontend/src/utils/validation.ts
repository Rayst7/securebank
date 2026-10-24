export const MAX_AMOUNT = 1_000_000

export interface AmountValidation {
  value: number
  error: string | null
}

export function parseAmount(raw: string, max = MAX_AMOUNT): AmountValidation {
  const normalized = raw.trim().replace(',', '.')

  if (!normalized) {
    return { value: 0, error: 'Ingresa un monto.' }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { value: 0, error: 'Usa solo números y hasta dos decimales.' }
  }

  const value = Number(normalized)

  if (!Number.isFinite(value) || value < 0.01) {
    return { value: 0, error: 'El monto mínimo es 0.01.' }
  }

  if (value > max) {
    return { value: 0, error: `El monto máximo es ${max.toLocaleString('es-GT')}.` }
  }

  return { value, error: null }
}

export function requiredText(
  value: string,
  label: string,
  maxLength: number,
): string | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return `${label} es obligatorio.`
  }

  if (trimmed.length > maxLength) {
    return `${label} no debe superar ${maxLength} caracteres.`
  }

  return null
}

export function accountNumberError(value: string): string | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'El número de cuenta es obligatorio.'
  }

  if (trimmed.length > 30) {
    return 'El número de cuenta no debe superar 30 caracteres.'
  }

  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
    return 'Usa solo letras, números y guiones.'
  }

  return null
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}
