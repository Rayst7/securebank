export interface Beneficiary {
  id: string
  alias: string
  accountNumber: string
  bankName: string
  createdAt: string
  updatedAt: string
}

export interface CreateBeneficiaryRequest {
  alias: string
  accountNumber: string
  bankName: string
}

export interface CreatedBeneficiary {
  id: string
  alias: string
  accountNumber: string
  bankName: string
  createdAt: string
}
