import type { CreatePaymentRequest, Payment } from '../types/payment'
import { apiRequest } from './api'

export const paymentsService = {
  list(): Promise<Payment[]> {
    return apiRequest<Payment[]>('/payments')
  },

  findOne(paymentId: string): Promise<Payment> {
    return apiRequest<Payment>(`/payments/${paymentId}`)
  },

  create(payload: CreatePaymentRequest): Promise<Payment> {
    return apiRequest<Payment>('/payments', {
      method: 'POST',
      body: payload,
    })
  },
}
