export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'CLOSED'

export interface Account {
  id: string
  accountNumber: string
  /** El backend devuelve el saldo como string decimal, por ejemplo "1000.00". */
  balance: string
  currency: string
  status: AccountStatus
  createdAt: string
}
