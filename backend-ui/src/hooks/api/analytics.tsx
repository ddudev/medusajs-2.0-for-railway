import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { sdk } from "../../lib/client"

const ANALYTICS_QUERY_KEY = "analytics" as const

export type DateRange = { start_date?: string; end_date?: string }

export function useAnalyticsCart(days?: number, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "cart", days],
    queryFn: async () => {
      const q = days != null ? `?days=${days}` : ""
      return sdk.client.fetch(`/admin/analytics/cart${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsOrdersByStatus(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "orders-by-status", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/orders/by-status${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsOrdersByTime(
  params: { start_date: string; end_date: string; group_by?: "day" | "week" | "month" },
  options?: UseQueryOptions<unknown>
) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "orders-by-time", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set("start_date", params.start_date)
      search.set("end_date", params.end_date)
      if (params.group_by) search.set("group_by", params.group_by)
      return sdk.client.fetch(`/admin/analytics/orders/by-time?${search}`, { method: "GET" })
    },
    enabled: !!(params.start_date && params.end_date),
    ...options,
  })
}

export function useAnalyticsSales(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "sales", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/sales${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsSalesChart(
  params: { start_date: string; end_date: string; group_by?: "day" | "week" | "month" },
  options?: UseQueryOptions<unknown>
) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "sales-chart", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set("start_date", params.start_date)
      search.set("end_date", params.end_date)
      if (params.group_by) search.set("group_by", params.group_by)
      return sdk.client.fetch(`/admin/analytics/sales/chart?${search}`, { method: "GET" })
    },
    enabled: !!(params.start_date && params.end_date),
    ...options,
  })
}

export function useAnalyticsRefunds(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "refunds", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/refunds${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsCustomers(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "customers", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/customers${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsRegions(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "regions", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/regions${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsSalesChannels(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "sales-channels", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/sales-channels${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsPaymentProviders(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "payment-providers", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/payment-providers${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsMarketing(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "marketing", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/marketing${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsProducts(params?: DateRange & { limit?: number }, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "products", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      if (params?.limit != null) search.set("limit", String(params.limit))
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/products${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsCustomerOrigin(params?: DateRange, options?: UseQueryOptions<unknown>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "customer-origin", params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.start_date) search.set("start_date", params.start_date)
      if (params?.end_date) search.set("end_date", params.end_date)
      const q = search.toString() ? `?${search}` : ""
      return sdk.client.fetch(`/admin/analytics/customer-origin${q}`, { method: "GET" })
    },
    ...options,
  })
}

export function useAnalyticsSettings(options?: UseQueryOptions<{ posthog_dashboard_embed_url: string | null }>) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "settings"],
    queryFn: async () => {
      return sdk.client.fetch<{ posthog_dashboard_embed_url: string | null }>("/admin/analytics/settings", {
        method: "GET",
      })
    },
    ...options,
  })
}
