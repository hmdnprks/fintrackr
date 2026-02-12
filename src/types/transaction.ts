export type Transaction = {
  transactionDate: string
  postingDate: string
  reference: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  balance: number
  category?: string
}
