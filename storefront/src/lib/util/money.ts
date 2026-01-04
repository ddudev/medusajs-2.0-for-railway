import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

/**
 * Official EUR to BGN conversion rate as per Bulgarian Ministry requirements
 * 1 EUR = 1.95583 BGN (fixed rate)
 */
const EUR_TO_BGN_RATE = 1.95583

/**
 * Price parts for separate styling
 */
export type PriceParts = {
  eur: string
  bgn: string
  full: string // Full string for backward compatibility
}

/**
 * Formats price with EUR as primary currency and BGN in brackets
 * Per Bulgarian Ministry requirements: All prices must show EUR first, then BGN
 * 
 * @param amount - Price amount (assumed to be in EUR from Medusa)
 * @param currency_code - Currency code (should be EUR)
 * @param minimumFractionDigits - Minimum decimal places (default: 2)
 * @param maximumFractionDigits - Maximum decimal places (default: 2)
 * @param locale - Locale for formatting (default: "en-US")
 * @returns PriceParts object with separate eur, bgn, and full string
 */
export const convertToLocaleParts = ({
  amount,
  currency_code,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  locale = "en-US",
}: ConvertToLocaleParams): PriceParts => {
  if (!currency_code || isEmpty(currency_code)) {
    const amountStr = amount.toString()
    return {
      eur: amountStr,
      bgn: amountStr,
      full: amountStr,
    }
  }

  // Convert to EUR if currency is BGN (shouldn't happen, but handle it)
  const eurAmount = currency_code.toUpperCase() === 'BGN' 
    ? amount / EUR_TO_BGN_RATE 
    : amount
  
  // Calculate BGN amount using official conversion rate
  const bgnAmount = eurAmount * EUR_TO_BGN_RATE
  
  // Format EUR (primary currency)
  const eurFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(eurAmount)
  
  // Format BGN (secondary currency in brackets)
  const bgnFormatted = new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(bgnAmount)
  
  // Return parts for flexible rendering
  return {
    eur: eurFormatted,
    bgn: bgnFormatted,
    full: `${eurFormatted} (${bgnFormatted})`,
  }
}

/**
 * Formats price with EUR as primary currency and BGN in brackets
 * Returns a string for backward compatibility
 * 
 * @param amount - Price amount (assumed to be in EUR from Medusa)
 * @param currency_code - Currency code (should be EUR)
 * @param minimumFractionDigits - Minimum decimal places (default: 2)
 * @param maximumFractionDigits - Maximum decimal places (default: 2)
 * @param locale - Locale for formatting (default: "en-US")
 * @returns Formatted string: "€X.XX (лв. Y.YY)"
 */
export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  locale = "en-US",
}: ConvertToLocaleParams): string => {
  const parts = convertToLocaleParts({
    amount,
    currency_code,
    minimumFractionDigits,
    maximumFractionDigits,
    locale,
  })
  return parts.full
}
