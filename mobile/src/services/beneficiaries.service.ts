import type {
  Beneficiary,
  CreateBeneficiaryRequest,
  CreatedBeneficiary,
} from '../types/beneficiary'
import { apiRequest } from './api'

export const beneficiariesService = {
  list(): Promise<Beneficiary[]> {
    return apiRequest<Beneficiary[]>('/beneficiaries')
  },

  create(payload: CreateBeneficiaryRequest): Promise<CreatedBeneficiary> {
    return apiRequest<CreatedBeneficiary>('/beneficiaries', {
      method: 'POST',
      body: payload,
    })
  },
}
