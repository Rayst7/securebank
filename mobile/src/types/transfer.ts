export type TransferStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'FAILED'

export interface Transfer {
  id: string
  reference: string
  amount: string
  currency: string
  status: TransferStatus
  description: string | null
  /** Número de cuenta de origen (el backend devuelve el string, no un objeto). */
  sourceAccount: string
  /** Número de cuenta de destino. */
  destinationAccount: string
  createdAt: string
}

export interface CreateTransferRequest {
  sourceAccountId: string
  destinationAccountId: string
  amount: number
  idempotencyKey: string
  description?: string
}

export interface TransferResult {
  id: string
  reference: string
  amount: string
  currency: string
  status: TransferStatus
  description: string | null
  createdAt: string
}
