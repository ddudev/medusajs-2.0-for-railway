"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { customerKeys } from "@lib/hooks/use-customer"

/**
 * When the account dashboard is shown (user is logged in), invalidate the
 * customer query so the nav and any other useCustomer() subscribers refetch
 * and show the correct "Account" state instead of "Log in".
 */
export default function InvalidateCustomerOnMount() {
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: customerKeys.detail() })
  }, [queryClient])

  return null
}
