"use client"

import { useMemo } from "react"
import { Truck } from "lucide-react"
import { convertToLocale } from "@lib/util/money"
import { FreeShippingEligibility } from "@lib/data/free-shipping"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

// Primary color from theme
const PRIMARY_COLOR = "#519717"

type FreeShippingProgressProps = {
  eligibility: FreeShippingEligibility | null
  variant?: "default" | "compact"
}

export default function FreeShippingProgress({
  eligibility,
  variant = "default",
}: FreeShippingProgressProps) {
  const { t } = useTranslation()

  const progressData = useMemo(() => {
    if (!eligibility) {
      return null
    }

    // If minimumTotal is null, it means no promotion was found
    // We should still show something if there's a promotion but no minimum set
    if (eligibility.minimumTotal === null || eligibility.minimumTotal === undefined) {
      return null
    }

    const { eligible, currentTotal, minimumTotal, amountRemaining, percentage, currencyCode } =
      eligibility

    return {
      eligible,
      currentTotal,
      minimumTotal,
      amountRemaining,
      percentage,
      currencyCode,
    }
  }, [eligibility])

  // Don't render if no eligibility data or already eligible
  if (!progressData || progressData.eligible) {
    // Silently return null - no need to log expected behavior
    return null
  }

  const { amountRemaining, minimumTotal, percentage, currencyCode } = progressData

  const formattedAmount = convertToLocale({
    amount: amountRemaining || 0,
    currency_code: currencyCode,
  })

  const formattedMinimum = convertToLocale({
    amount: minimumTotal || 0,
    currency_code: currencyCode,
  })

  // Icon is always positioned at exactly 80% of the progress bar
  const iconPosition = 80

  // Progress bar shows actual progress percentage (not extended to icon)
  const progressBarWidth = Math.min(100, percentage)

  if (variant === "compact") {
    return (
      <div className="w-full py-3">
        <div className="flex justify-center mb-2">
          <span className="inline-block px-3 py-1.5 rounded-md shadow-sm bg-gray-100 text-gray-900 border border-gray-300 whitespace-nowrap font-semibold text-xs">
            {t("cart.freeShipping.left", {
              amount: formattedAmount,
              defaultValue: `${formattedAmount} left`,
            })}
          </span>
        </div>
        <div className="relative w-full pb-3">
          <div className="relative w-full h-2.5 rounded-full bg-gray-200">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, progressBarWidth)}%`,
                backgroundColor: PRIMARY_COLOR,
              }}
            />
            <div
              className="absolute flex flex-col items-center z-10"
              style={{
                left: `${iconPosition}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <Truck className="h-[22px] w-[22px] text-primary" style={{ color: PRIMARY_COLOR }} />
              <span className="text-gray-500 text-xs mt-1 whitespace-nowrap">
                {formattedMinimum}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-4">
      <div className="flex justify-center mb-2">
        <span className="inline-block px-4 py-2 rounded-lg shadow-md bg-gray-100 text-gray-900 border border-gray-300 whitespace-nowrap text-sm font-semibold">
          {t("cart.freeShipping.left", {
            amount: formattedAmount,
            defaultValue: `${formattedAmount} left till free shipping`,
          })}
        </span>
      </div>
      <div className="relative w-full pb-4">
        <div className="relative w-full h-3 rounded-full bg-gray-200">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, progressBarWidth)}%`,
              backgroundColor: PRIMARY_COLOR,
            }}
          />
          <div
            className="absolute flex flex-col items-center z-10"
            style={{
              left: `${iconPosition}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <Truck className="h-7 w-7 text-primary" style={{ color: PRIMARY_COLOR }} />
            <span className="text-gray-500 text-sm mt-1.5 whitespace-nowrap">
              {formattedMinimum}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

