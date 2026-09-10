/**
 * Paystack Payment & Fee Calculation Utilities
 * 
 * Standard Ghana Paystack Transaction Fee: 1.95% (Mobile Money & Local Cards)
 * Uses the exact gross-up formula so the merchant receives 100% of their net price:
 * Gross Price = Net Price / (1 - rate)
 */

export interface FeeCalculationResult {
  baseNetPrice: number;
  feePercent: number;
  feeAmount: number;
  exactGrossPrice: number;
  roundedGrossPrice: number;
}

/**
 * Calculates the gross selling price so that after Paystack deducts its fee percentage,
 * the merchant receives exactly the baseNetPrice.
 * 
 * @param baseNetPrice - Desired net amount the merchant wants to receive (in GH₵)
 * @param feePercent - Paystack fee rate in percent (default: 1.95)
 */
export function calculateGrossPrice(
  baseNetPrice: number,
  feePercent: number = 1.95
): FeeCalculationResult {
  if (isNaN(baseNetPrice) || baseNetPrice <= 0) {
    return {
      baseNetPrice: 0,
      feePercent,
      feeAmount: 0,
      exactGrossPrice: 0,
      roundedGrossPrice: 0,
    };
  }

  const rate = feePercent / 100;
  // Gross up formula: Net / (1 - feeRate)
  const exactGross = baseNetPrice / (1 - rate);
  const feeAmount = exactGross - baseNetPrice;
  const roundedGross = Math.ceil(exactGross); // Round up to nearest whole cedi for clean customer pricing

  return {
    baseNetPrice: Number(baseNetPrice.toFixed(2)),
    feePercent,
    feeAmount: Number(feeAmount.toFixed(2)),
    exactGrossPrice: Number(exactGross.toFixed(2)),
    roundedGrossPrice: roundedGross,
  };
}

/**
 * Calculates the Paystack fee deducted from a given total amount.
 */
export function calculatePaystackFee(
  totalAmount: number,
  feePercent: number = 1.95
): number {
  if (isNaN(totalAmount) || totalAmount <= 0) return 0;
  return Number((totalAmount * (feePercent / 100)).toFixed(2));
}
