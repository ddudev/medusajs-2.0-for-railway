"use client"

import { useMemo } from "react"
import { Box, Typography } from "@mui/material"
import { LocalShipping } from "@mui/icons-material"
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
      <Box className="w-full py-3">
        {/* Centered callout text */}
        <Box className="flex justify-center mb-2">
          <Box
            className="px-3 py-1.5 rounded-md shadow-sm"
            sx={{
              backgroundColor: "#f3f4f6", // gray-100
              color: "#111827", // gray-900
              border: "1px solid #d1d5db", // gray-300
              whiteSpace: "nowrap",
            }}
          >
            <Typography variant="caption" className="font-semibold text-xs">
              {t("cart.freeShipping.left", {
                amount: formattedAmount,
                defaultValue: `${formattedAmount} left`,
              })}
            </Typography>
          </Box>
        </Box>

        <Box className="relative w-full" sx={{ pb: 3 }}>
          {/* Progress Bar */}
          <Box
            className="relative w-full h-2.5 rounded-full"
            sx={{
              backgroundColor: "#e5e7eb",
              position: "relative",
            }}
          >
            {/* Filled portion - use primary color */}
            <Box
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
              sx={{
                width: `${Math.min(100, progressBarWidth)}%`,
                backgroundColor: PRIMARY_COLOR,
              }}
            />

            {/* Free shipping icon positioned at exactly 80% */}
            <Box
              className="absolute flex flex-col items-center"
              sx={{
                left: `${iconPosition}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 10,
              }}
            >
              {/* Free shipping icon */}
              <LocalShipping
                sx={{
                  color: PRIMARY_COLOR,
                  fontSize: 22,
                }}
              />
              {/* Target total label */}
              <Typography
                variant="caption"
                className="text-gray-500 text-xs mt-1"
                sx={{ color: "#6b7280", whiteSpace: "nowrap" }}
              >
                {formattedMinimum}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box className="w-full py-4">
      {/* Centered callout text */}
      <Box className="flex justify-center mb-2">
        <Box
          className="px-4 py-2 rounded-lg shadow-md"
          sx={{
            backgroundColor: "#f3f4f6", // gray-100
            color: "#111827", // gray-900
            border: "1px solid #d1d5db", // gray-300
            whiteSpace: "nowrap",
          }}
        >
          <Typography variant="body2" className="font-semibold">
            {t("cart.freeShipping.left", {
              amount: formattedAmount,
              defaultValue: `${formattedAmount} left till free shipping`,
            })}
          </Typography>
        </Box>
      </Box>

      <Box className="relative w-full" sx={{ pb: 4 }}>
        {/* Progress Bar */}
        <Box
          className="relative w-full h-3 rounded-full"
          sx={{
            backgroundColor: "#e5e7eb",
            position: "relative",
          }}
        >
          {/* Filled portion - use primary color */}
          <Box
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
            sx={{
              width: `${Math.min(100, progressBarWidth)}%`,
              backgroundColor: PRIMARY_COLOR,
            }}
          />

          {/* Free shipping icon positioned at exactly 80% */}
          <Box
            className="absolute flex flex-col items-center"
            sx={{
              left: `${iconPosition}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
            }}
          >
            {/* Free shipping icon */}
            <LocalShipping
              sx={{
                color: PRIMARY_COLOR,
                fontSize: 28,
              }}
            />
            {/* Target total label */}
            <Typography
              variant="body2"
              className="text-gray-500 mt-1.5"
              sx={{ color: "#6b7280", whiteSpace: "nowrap" }}
            >
              {formattedMinimum}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

