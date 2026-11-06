import type { AccountStatus } from '../types/account'
import type { PaymentStatus } from '../types/payment'
import type { TransactionType } from '../types/transaction'
import type { TransferStatus } from '../types/transfer'

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: 'Depósito',
  WITHDRAWAL: 'Retiro',
  TRANSFER_IN: 'Transferencia recibida',
  TRANSFER_OUT: 'Transferencia enviada',
  PAYMENT: 'Pago de servicio',
}

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: 'Activa',
  BLOCKED: 'Bloqueada',
  CLOSED: 'Cerrada',
}

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  REJECTED: 'Rechazada',
  FAILED: 'Fallida',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
  REJECTED: 'Rechazado',
  FAILED: 'Fallido',
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'COMPLETED':
    case 'ACTIVE':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'REJECTED':
    case 'FAILED':
    case 'BLOCKED':
      return 'danger'
    default:
      return 'neutral'
  }
}
