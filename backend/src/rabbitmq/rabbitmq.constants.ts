export const BANKING_EVENTS = {
  TRANSFER_CREATED: 'TransferCreated',
  TRANSFER_COMPLETED: 'TransferCompleted',
  TRANSFER_REJECTED: 'TransferRejected',
  PAYMENT_CREATED: 'PaymentCreated',
  FRAUD_ALERT: 'FraudAlert',
} as const;

export type BankingEvent =
  (typeof BANKING_EVENTS)[keyof typeof BANKING_EVENTS];