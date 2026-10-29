import { QueryClient } from '@tanstack/react-query'
import { queryRetryDelay, shouldRetryQuery } from '@/lib/query-retry'

/** Rooms, categories, tariffs and settings change rarely. */
export const CATALOG_STALE_TIME = 5 * 60 * 1000

/** Occupancy and booking lists. Mutations still invalidate these immediately. */
export const OPERATIONAL_STALE_TIME = 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60 * 1000,
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
})
