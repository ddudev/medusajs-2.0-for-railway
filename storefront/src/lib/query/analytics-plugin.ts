import { MutationCache, QueryCache } from '@tanstack/react-query'

/**
 * TanStack Query plugin for automatic analytics tracking
 * Intercepts mutations to track cart operations automatically
 * 
 * Note: This would be initialized with the query client
 * For now, analytics are tracked directly in the mutation hooks
 * 
 * Future enhancement: Create full plugin system that:
 * - Tracks all cart mutations automatically
 * - Extracts relevant data from mutation variables
 * - Sends events to PostHog
 * - Handles error tracking
 */

export function createAnalyticsPlugin() {
  return {
    mutationCache: new MutationCache({
      onSuccess: (data, variables, context, mutation) => {
        // Future: Auto-track based on mutation key
        // For now, tracking happens in individual hooks
      },
      onError: (error, variables, context, mutation) => {
        // Track mutation errors
        console.error('Mutation failed:', error)
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Track query errors
        console.error('Query failed:', error)
      },
    }),
  }
}

/**
 * Note: To use this plugin, integrate it in the QueryClient creation:
 * 
 * export function makeQueryClient() {
 *   const plugin = createAnalyticsPlugin()
 *   
 *   return new QueryClient({
 *     mutationCache: plugin.mutationCache,
 *     queryCache: plugin.queryCache,
 *     defaultOptions: { ... }
 *   })
 * }
 */
