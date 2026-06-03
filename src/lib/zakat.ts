// Zakat Penghasilan (Income Zakat) — 2.5% of income above nisab threshold.
// Nisab = 85 grams of gold × current gold price.
// Source: BAZNAS Indonesia. Update NISAB_ANNUAL each year.
// Latest update: 2025 — based on gold price Rp 1,500,000/gram × 85g = Rp 127,500,000/year
export const NISAB_YEAR    = 2025
export const NISAB_ANNUAL  = 127_500_000   // IDR per year
export const NISAB_MONTHLY = Math.round(NISAB_ANNUAL / 12)  // ≈ Rp 10,625,000/month
export const ZAKAT_RATE    = 0.025         // 2.5%

export type ZakatResult =
  | { status: 'below_nisab'; monthlyIncome: number; nisabMonthly: number }
  | { status: 'above_nisab'; monthlyIncome: number; nisabMonthly: number; monthlyZakat: number; annualZakat: number }

export function calcZakat(avgMonthlyIncome: number): ZakatResult {
  if (avgMonthlyIncome < NISAB_MONTHLY) {
    return { status: 'below_nisab', monthlyIncome: avgMonthlyIncome, nisabMonthly: NISAB_MONTHLY }
  }
  return {
    status: 'above_nisab',
    monthlyIncome: avgMonthlyIncome,
    nisabMonthly: NISAB_MONTHLY,
    monthlyZakat: Math.round(avgMonthlyIncome * ZAKAT_RATE),
    annualZakat:  Math.round(avgMonthlyIncome * 12 * ZAKAT_RATE),
  }
}
