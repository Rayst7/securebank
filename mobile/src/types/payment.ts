export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'FAILED'

export interface Payment {
  id: string
  serviceName: string
  serviceReference: string
  amount: string
  currency: string
  status: PaymentStatus
  accountId: string
  createdAt: string
}

export interface CreatePaymentRequest {
  accountId: string
  idempotencyKey: string
  serviceName: string
  serviceReference: string
  /** El backend espera un número JSON, no un string. */
  amount: number
}
