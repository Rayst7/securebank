export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'PAYMENT'

export interface Transaction {
  id: string
  type: TransactionType
  amount: string
  currency: string
  description: string | null
  transferId: string | null
  paymentId: string | null
  createdAt: string
}
