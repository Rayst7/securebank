import type { TransactionType } from '../types/transaction'

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatMoney(value: string | number, currency = 'GTQ'): string {
  const amount = typeof value === 'string' ? Number(value) : value

  if (!Number.isFinite(amount)) {
    return '—'
  }

  try {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return dateFormatter.format(date)
}

export function shortenReference(value: string, visible = 8): string {
  if (value.length <= visible) {
    return value
  }
  return `${value.slice(0, visible)}…`
}

export function initials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0)
  const last = lastName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || 'SB'
}

export function isCreditTransaction(type: TransactionType): boolean {
  return type === 'DEPOSIT' || type === 'TRANSFER_IN'
}

export function formatSignedAmount(
  amount: string,
  currency: string,
  isCredit: boolean,
): string {
  return `${isCredit ? '+' : '−'}${formatMoney(amount, currency)}`
}

export function formatAccountNumber(accountNumber: string): string {
  return accountNumber.trim()
}
