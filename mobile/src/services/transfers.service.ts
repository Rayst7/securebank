import type { CreateTransferRequest, Transfer, TransferResult } from '../types/transfer'
import { apiRequest } from './api'

export const transfersService = {
  list(): Promise<Transfer[]> {
    return apiRequest<Transfer[]>('/transfers')
  },

  create(payload: CreateTransferRequest): Promise<TransferResult> {
    return apiRequest<TransferResult>('/transfers', {
      method: 'POST',
      body: payload,
    })
  },
}
