'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to check if we're running on the client side
 * Useful for preventing SSR/hydration issues with components that need browser APIs
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}
