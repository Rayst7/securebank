import type { Account } from '../types/account'
import type { Transaction } from '../types/transaction'
import { apiRequest } from './api'

export const accountsService = {
  list(): Promise<Account[]> {
    return apiRequest<Account[]>('/accounts')
  },

  transactions(accountId: string): Promise<Transaction[]> {
    return apiRequest<Transaction[]>(`/accounts/${accountId}/transactions`)
  },
}
