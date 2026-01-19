import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh for 1 minute before refetching
        staleTime: 60 * 1000,
        // Cache garbage collection after 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry failed queries once
        retry: 1,
        // Don't refetch on window focus (prevents unnecessary requests)
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Don't retry mutations (let user retry manually)
        retry: 0,
      },
    },
  })
}

// Browser singleton - reuse across components
let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client per request
    // This prevents cross-request cache pollution
    return makeQueryClient()
  } else {
    // Browser: reuse singleton
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}
