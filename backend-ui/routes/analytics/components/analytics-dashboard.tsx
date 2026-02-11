"use client"

import { useState, useMemo, useEffect } from "react"
import { Link } from "react-router-dom"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  useAnalyticsCart,
  useAnalyticsOrdersByStatus,
  useAnalyticsSales,
  useAnalyticsSalesChart,
  useAnalyticsRefunds,
  useAnalyticsCustomers,
  useAnalyticsRegions,
  useAnalyticsSalesChannels,
  useAnalyticsPaymentProviders,
  useAnalyticsMarketing,
  useAnalyticsProducts,
  useAnalyticsCustomerOrigin,
  useAnalyticsSettings,
  type DateRange,
} from "../../../src/hooks/api/analytics"
import { AnalyticsCard } from "./analytics-card"
import { MicroBar } from "./micro-bar"
import { AnalyticsPaginatedList } from "./analytics-paginated-list"
import { AnalyticsDateRangePicker } from "./analytics-date-range-picker"
import { normalizeEmbedUrl } from "../../../src/lib/embed-url"
import { useSalesChannels } from "../../../src/hooks/api/sales-channels"
import { useStore } from "../../../src/hooks/api/store"

function formatNumber(n: number): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "—"
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatCurrency(value: number | undefined, currency = "EUR"): string {
  if (value == null || typeof value !== "number" || Number.isNaN(value))
    return "—"
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  })
}

/** e.g. "free_shipping" → "Free shipping" */
function humanizeLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** e.g. "pp_stripe_stripe" → "Stripe", "unknown" → "Unknown" */
function paymentProviderDisplayName(providerId: string): string {
  if (providerId === "all") return "All providers"
  if (providerId === "unknown") return "Unknown"
  const withoutPrefix = providerId.replace(/^pp_/, "")
  const parts = withoutPrefix.split("_").filter(Boolean)
  const unique = parts.filter((v, i, a) => a.indexOf(v) === i)
  const segment = unique[0] ?? providerId
  return humanizeLabel(segment)
}

/** Shorten long IDs for display, e.g. "sc_01K8...93AHE" */
function shortenId(id: string, tailChars = 8): string {
  if (!id || id.length <= tailChars + 4) return id
  return `…${id.slice(-tailChars)}`
}

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
  }
}

function daysFromRange(range: DateRange): number {
  if (!range.start_date || !range.end_date) return 30
  const a = new Date(range.start_date).getTime()
  const b = new Date(range.end_date).getTime()
  return Math.max(1, Math.round((b - a) / (24 * 60 * 60 * 1000)))
}

/** Format period (e.g. "2026-01-12") for chart axis as "12 Jan" */
function formatPeriodLabel(period: string): string {
  const d = new Date(period)
  if (Number.isNaN(d.getTime())) return period
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--color-ui-bg-base)",
    border: "1px solid var(--color-ui-border-base)",
    borderRadius: "var(--radius-md)",
    padding: "8px 12px",
    boxShadow: "var(--shadow-elevation-floating)",
  },
  labelStyle: { color: "var(--color-ui-fg-base)" },
  itemStyle: { color: "var(--color-ui-fg-base)" },
}

const PIE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
]

/** Resolve axis tick color so Recharts SVG gets a real value (CSS vars don't always work in SVG attributes). */
function useAxisTickColor(): string {
  const [color, setColor] = useState("#e5e5e5")
  useEffect(() => {
    const el = document.documentElement
    const resolved = getComputedStyle(el).getPropertyValue("--color-ui-fg-base").trim()
    if (resolved) setColor(resolved)
  }, [])
  return color
}

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)
  const [activeTab, setActiveTab] = useState<"overview" | "posthog">("overview")

  const range = dateRange
  const days = daysFromRange(range)

  const cart = useAnalyticsCart(days)
  const ordersByStatus = useAnalyticsOrdersByStatus(range)
  const sales = useAnalyticsSales(range)
  const salesChart = useAnalyticsSalesChart({
    ...range,
    start_date: range.start_date!,
    end_date: range.end_date!,
    group_by: "day",
  })
  const refunds = useAnalyticsRefunds(range)
  const customers = useAnalyticsCustomers(range)
  const regions = useAnalyticsRegions(range)
  const salesChannels = useAnalyticsSalesChannels(range)
  const paymentProviders = useAnalyticsPaymentProviders(range)
  const marketing = useAnalyticsMarketing(range)
  const products = useAnalyticsProducts({ ...range, limit: 10 })
  const customerOrigin = useAnalyticsCustomerOrigin(range)
  const analyticsSettings = useAnalyticsSettings()
  const { store } = useStore()

  const storeCurrency =
    store?.supported_currencies?.find((c: { is_default?: boolean }) => c.is_default)?.currency_code ?? "EUR"

  const posthogUrlRaw = analyticsSettings.data?.posthog_dashboard_embed_url ?? null
  const posthogUrl = useMemo(() => normalizeEmbedUrl(posthogUrlRaw), [posthogUrlRaw])
  const showPostHogTab = !!posthogUrl

  const lastRefreshed = useMemo(
    () => new Date().toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }),
    [dateRange]
  )

  const salesData = sales.data as
    | {
        total_sales?: number
        net_sales?: number
        total_refunded?: number
        order_count?: number
        average_sales?: number
      }
    | undefined
  const customersData = customers.data as
    | { total_customers?: number; repeat_customer_rate?: number; average_sales_per_customer?: number }
    | undefined
  const ordersByStatusData = ordersByStatus.data as
    | {
        by_status?: Record<string, { count: number; total: number }>
        total_orders?: number
        average_units_per_order?: number
      }
    | undefined

  const refundData =
    refunds.data && typeof refunds.data === "object" && "total_refunded" in refunds.data
      ? (refunds.data as { total_refunded?: number; refund_count?: number })
      : undefined

  const grossSales = salesData?.total_sales ?? 0
  const orderCount = salesData?.order_count ?? 0
  const returnRate = customersData?.repeat_customer_rate ?? 0
  const ordersFulfilled =
    ordersByStatusData?.by_status?.completed?.count ??
    ordersByStatusData?.total_orders ??
    0

  const chartRows = (salesChart.data as { chart?: { period: string; orders: number; total: number }[] })?.chart ?? []
  const chartData = useMemo(() => {
    const byPeriod = new Map<string, { total: number; orders: number; aov: number }>()
    for (const r of chartRows) {
      const total = r.total ?? 0
      const orders = r.orders ?? 0
      byPeriod.set(r.period, {
        total,
        orders,
        aov: orders ? total / orders : 0,
      })
    }
    const start = range.start_date ? new Date(range.start_date) : null
    const end = range.end_date ? new Date(range.end_date) : null
    if (!start || !end || end < start) {
      return chartRows.map((r) => ({
        period: r.period,
        total: r.total ?? 0,
        orders: r.orders ?? 0,
        aov: (r.orders ? (r.total ?? 0) / r.orders : 0),
      }))
    }
    const out: { period: string; total: number; orders: number; aov: number }[] = []
    const cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    while (cursor <= endDay) {
      const period = cursor.toISOString().slice(0, 10)
      const data = byPeriod.get(period) ?? { total: 0, orders: 0, aov: 0 }
      out.push({ period, ...data })
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }, [chartRows, range.start_date, range.end_date])
  const hasChartData = chartData.length > 0 && chartData.some((d) => d.total > 0 || d.orders > 0)

  const ordersByStatusPieData = useMemo(() => {
    if (!ordersByStatusData?.by_status) return []
    return Object.entries(ordersByStatusData.by_status).map(([name, v]) => ({
      name,
      value: v?.count ?? 0,
    }))
  }, [ordersByStatusData?.by_status])

  const axisTickColor = useAxisTickColor()

  const salesChannelsList = useSalesChannels()
  const salesChannelNameMap = useMemo(() => {
    const list = (salesChannelsList as { sales_channels?: { id: string; name: string }[] })?.sales_channels ?? []
    return Object.fromEntries(list.map((sc) => [sc.id, sc.name ?? sc.id]))
  }, [salesChannelsList])

  return (
    <Container className="p-0 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-ui-border-base">
        <div>
          <Heading level="h1">Analytics</Heading>
          <Text size="small" className="text-ui-fg-muted mt-1">
            Last refreshed: {lastRefreshed}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ui-fg-muted text-sm">Date range:</span>
          <AnalyticsDateRangePicker value={range} onChange={setDateRange} />
        </div>
      </div>

      {showPostHogTab && (
        <div className="flex gap-1 border-b border-ui-border-base">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium rounded-t-md ${
              activeTab === "overview"
                ? "bg-ui-bg-base border border-ui-border-base border-b-0 -mb-px"
                : "text-ui-fg-muted hover:text-ui-fg-base"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("posthog")}
            className={`px-4 py-2 text-sm font-medium rounded-t-md ${
              activeTab === "posthog"
                ? "bg-ui-bg-base border border-ui-border-base border-b-0 -mb-px"
                : "text-ui-fg-muted hover:text-ui-fg-base"
            }`}
          >
            Product analytics
          </button>
        </div>
      )}

      {activeTab === "posthog" && showPostHogTab && posthogUrl && (
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-sm overflow-hidden ring-1 ring-ui-border-base/50">
          <iframe
            src={posthogUrl}
            title="PostHog dashboard"
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="w-full border-0 block"
            style={{ minHeight: "1600px", height: "1600px" }}
            allowFullScreen
          />
        </div>
      )}

      {activeTab === "overview" && (
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 md:p-6 space-y-6">
          {/* KPI row - label + value only, compact */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-base shadow-sm p-2.5 ring-1 ring-ui-border-base/50">
              <Text size="small" className="text-ui-fg-muted">
                Gross sales
              </Text>
              <Text weight="plus" size="base" className="block mt-0.5">
                {formatCurrency(grossSales, storeCurrency)}
              </Text>
            </div>
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-base shadow-sm p-2.5 ring-1 ring-ui-border-base/50">
              <Text size="small" className="text-ui-fg-muted">
                Returning customer rate
              </Text>
              <Text weight="plus" size="base" className="block mt-0.5">
                {formatNumber(returnRate)}%
              </Text>
            </div>
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-base shadow-sm p-2.5 ring-1 ring-ui-border-base/50">
              <Text size="small" className="text-ui-fg-muted">
                Orders fulfilled
              </Text>
              <Text weight="plus" size="base" className="block mt-0.5">
                {formatNumber(ordersFulfilled)}
              </Text>
            </div>
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-base shadow-sm p-2.5 ring-1 ring-ui-border-base/50">
              <Text size="small" className="text-ui-fg-muted">
                Orders
              </Text>
              <Text weight="plus" size="base" className="block mt-0.5">
                {formatNumber(orderCount)}
              </Text>
            </div>
          </div>

          <AnalyticsCard
            title="Total sales over time"
            loading={salesChart.isLoading}
            error={salesChart.error}
            empty={false}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-[#3b82f6]" aria-hidden />
                <Text size="xsmall" className="text-ui-fg-muted">
                  TRENDS • LAST {days} DAYS
                </Text>
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                Daily total sales in the selected period.
              </Text>
              <div className="w-full" style={{ minHeight: 280, height: 280 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ui-border-base)" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12, fill: axisTickColor }}
                      tickFormatter={formatPeriodLabel}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: axisTickColor }}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                      labelStyle={CHART_TOOLTIP_STYLE.labelStyle}
                      itemStyle={CHART_TOOLTIP_STYLE.itemStyle}
                      formatter={(v: number) => [formatCurrency(v, storeCurrency), "Total sales"]}
                      labelFormatter={formatPeriodLabel}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Total sales"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!hasChartData && (
                <Text size="small" className="text-ui-fg-muted">
                  No data for this date range.
                </Text>
              )}
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            title="Average order value over time"
            loading={salesChart.isLoading}
            error={salesChart.error}
            empty={false}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-[#3b82f6]" aria-hidden />
                <Text size="xsmall" className="text-ui-fg-muted">
                  TRENDS • LAST {days} DAYS
                </Text>
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                Daily average order value.
              </Text>
              <div className="w-full" style={{ minHeight: 280, height: 280 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ui-border-base)" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: axisTickColor }}
                      tickFormatter={formatPeriodLabel}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: axisTickColor }}
                      tickFormatter={(v) => formatCurrency(v, storeCurrency)}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                      labelStyle={CHART_TOOLTIP_STYLE.labelStyle}
                      itemStyle={CHART_TOOLTIP_STYLE.itemStyle}
                      formatter={(v: number) => [formatCurrency(v, storeCurrency), "AOV"]}
                      labelFormatter={formatPeriodLabel}
                    />
                    <Line
                      type="monotone"
                      dataKey="aov"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="AOV"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!hasChartData && (
                <Text size="small" className="text-ui-fg-muted">
                  No data for this date range.
                </Text>
              )}
            </div>
          </AnalyticsCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnalyticsCard
              title="Total sales breakdown"
              loading={sales.isLoading}
              error={sales.error}
              empty={!salesData || (salesData.total_sales == null && salesData.net_sales == null)}
            >
              {salesData && (
                <ul className="space-y-3">
                  {[
                    { label: "Gross sales", value: salesData.total_sales, max: salesData.total_sales ?? 1 },
                    { label: "Net sales", value: salesData.net_sales, max: salesData.total_sales ?? 1 },
                    { label: "Refunded", value: salesData.total_refunded, max: salesData.total_sales ?? 1 },
                    { label: "Orders", value: salesData.order_count, max: Math.max(salesData.order_count ?? 1, 1) },
                    { label: "Average sale", value: salesData.average_sales, max: salesData.average_sales ?? 1 },
                  ].map(({ label, value, max }) => (
                    <li key={label} className="flex items-center justify-between gap-2">
                      <Text size="small" className="text-ui-fg-muted shrink-0 w-28">
                        {label}
                      </Text>
                      <Text size="small" className="shrink-0">
                        {typeof value === "number" ? (label.includes("sale") || label === "Refunded" ? formatCurrency(value, storeCurrency) : formatNumber(value)) : "—"}
                      </Text>
                      <MicroBar value={typeof value === "number" ? value : 0} max={max} className="flex-1 max-w-24" />
                    </li>
                  ))}
                </ul>
              )}
            </AnalyticsCard>

            <AnalyticsCard
              title="Orders by status"
              loading={ordersByStatus.isLoading}
              error={ordersByStatus.error}
              empty={ordersByStatusPieData.length === 0}
            >
              {ordersByStatusPieData.length > 0 ? (
                <div className="space-y-3">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ordersByStatusPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          stroke="var(--color-ui-bg-base)"
                          strokeWidth={2}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {ordersByStatusPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                          labelStyle={CHART_TOOLTIP_STYLE.labelStyle}
                          itemStyle={CHART_TOOLTIP_STYLE.itemStyle}
                          formatter={(v: number, name: string) => [formatNumber(v), name]}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                          formatter={(value) => <span style={{ color: "var(--color-ui-fg-base)" }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <Text size="small" className="text-ui-fg-muted">
                    Avg units/order: {formatNumber(ordersByStatusData?.average_units_per_order ?? 0)}
                  </Text>
                </div>
              ) : null}
            </AnalyticsCard>
          </div>

          <AnalyticsCard
            title="Cart"
            loading={cart.isLoading}
            error={cart.error}
            empty={
              !cart.data ||
              !(typeof cart.data === "object" && "average_cart_value" in cart.data)
            }
          >
            {cart.data && typeof cart.data === "object" && "average_cart_value" in cart.data ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[
                  { label: "Average cart value", value: (cart.data as any).average_cart_value, format: "currency" as const },
                  { label: "Abandoned carts", value: (cart.data as any).abandoned_count },
                  { label: "Abandoned avg value", value: (cart.data as any).abandoned_average_value, format: "currency" as const },
                  { label: "Total carts (with items)", value: (cart.data as any).total_carts },
                ].map(({ label, value, format }) => (
                  <div key={label} className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-2.5 ring-1 ring-ui-border-base/50">
                    <Stat label={label} value={value} format={format} compact currency={storeCurrency} />
                  </div>
                ))}
              </div>
            ) : null}
          </AnalyticsCard>

          <AnalyticsCard
            title="Refunds"
            loading={refunds.isLoading}
            error={refunds.error}
            empty={!refundData}
          >
            {refundData ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-2.5 ring-1 ring-ui-border-base/50">
                  <Stat label="Total refunded" value={refundData.total_refunded} format="currency" compact currency={storeCurrency} />
                </div>
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-2.5 ring-1 ring-ui-border-base/50">
                  <Stat label="Refund count" value={refundData.refund_count} compact currency={storeCurrency} />
                </div>
              </div>
            ) : null}
          </AnalyticsCard>

          <AnalyticsCard
            title="Customers"
            loading={customers.isLoading}
            error={customers.error}
            empty={
              !customersData ||
              (customersData.total_customers == null && customersData.repeat_customer_rate == null)
            }
          >
            {customersData ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[
                  { label: "Total customers", value: customersData.total_customers },
                  { label: "Avg sales/customer", value: customersData.average_sales_per_customer, format: "currency" as const },
                  { label: "Repeat rate %", value: customersData.repeat_customer_rate },
                ].map(({ label, value, format }) => (
                  <div key={label} className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-2.5 ring-1 ring-ui-border-base/50">
                    <Stat label={label} value={value} format={format} compact currency={storeCurrency} />
                  </div>
                ))}
              </div>
            ) : null}
          </AnalyticsCard>

          <AnalyticsCard
            title="Regions popularity"
            loading={regions.isLoading}
            error={regions.error}
            empty={
              !regions.data ||
              !(typeof regions.data === "object" && "regions" in regions.data) ||
              ((regions.data as any).regions?.length ?? 0) === 0
            }
          >
            {regions.data && typeof regions.data === "object" && "regions" in regions.data ? (
              <AnalyticsPaginatedList
                items={(regions.data as any).regions || []}
                pageSize={5}
                itemLabel="regions"
                renderItem={(r: { region_id: string; name: string; orders: number; total: number; currency_code?: string }) => {
                  const cc = (r.currency_code ?? "").toUpperCase().trim()
                  return `${r.name}: ${formatNumber(r.orders)} orders, ${formatNumber(r.total)}${cc ? ` ${cc}` : ""}`
                }}
              />
            ) : null}
          </AnalyticsCard>

          <AnalyticsCard
            title="Sales channel popularity"
            loading={salesChannels.isLoading}
            error={salesChannels.error}
            empty={
              !salesChannels.data ||
              !(typeof salesChannels.data === "object" && "channels" in salesChannels.data) ||
              ((salesChannels.data as any).channels?.length ?? 0) === 0
            }
          >
            {salesChannels.data && typeof salesChannels.data === "object" && "channels" in salesChannels.data ? (
              <AnalyticsPaginatedList
                items={(salesChannels.data as any).channels || []}
                pageSize={5}
                itemLabel="channels"
                renderItem={(c: { sales_channel_id: string; name?: string; orders: number; total: number }) => {
                  const label =
                    c.name ?? salesChannelNameMap[c.sales_channel_id] ?? (c.sales_channel_id === "default" ? "Default" : shortenId(c.sales_channel_id))
                  return `${label}: ${formatNumber(c.orders)} orders, ${formatCurrency(c.total, storeCurrency)}`
                }}
              />
            ) : null}
          </AnalyticsCard>

          <AnalyticsCard
            title="Payment provider popularity"
            loading={paymentProviders.isLoading}
            error={paymentProviders.error}
            empty={
              !paymentProviders.data ||
              !(typeof paymentProviders.data === "object" && "providers" in paymentProviders.data) ||
              ((paymentProviders.data as any).providers?.length ?? 0) === 0
            }
          >
            {paymentProviders.data && typeof paymentProviders.data === "object" && "providers" in paymentProviders.data ? (
              <AnalyticsPaginatedList
                items={(paymentProviders.data as any).providers || []}
                pageSize={5}
                itemLabel="providers"
                renderItem={(p: { provider_id: string; orders: number; total: number }) => {
                  const label = paymentProviderDisplayName(p.provider_id)
                  return `${label}: ${formatNumber(p.orders)} orders, ${formatCurrency(p.total, storeCurrency)}`
                }}
              />
            ) : null}
          </AnalyticsCard>

          <AnalyticsCard
            title="Top discounts"
            loading={marketing.isLoading}
            error={marketing.error}
            empty={
              !marketing.data ||
              !(typeof marketing.data === "object" && "top_discounts" in marketing.data) ||
              ((marketing.data as any).top_discounts?.length ?? 0) === 0
            }
          >
            {marketing.data && typeof marketing.data === "object" && "top_discounts" in marketing.data ? (
              <AnalyticsPaginatedList
                items={(marketing.data as any).top_discounts || []}
                pageSize={5}
                itemLabel="discounts"
                renderItem={(d: { code?: string; orders: number; discount_total: number }) => {
                  const label = d.code ? humanizeLabel(d.code) : "—"
                  return `${label}: ${formatNumber(d.orders)} orders, ${formatCurrency(d.discount_total, storeCurrency)} discount`
                }}
              />
            ) : null}
          </AnalyticsCard>

          <AnalyticsCard
            title="Products"
            loading={products.isLoading}
            error={products.error}
            empty={
              !products.data ||
              !(typeof products.data === "object" && "top_variants" in products.data)
            }
          >
            {products.data && typeof products.data === "object" && "top_variants" in products.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Products sold (count)" value={(products.data as any).products_sold_count} currency={storeCurrency} />
                  <Stat label="Out of stock variants" value={(products.data as any).out_of_stock_variants_count} currency={storeCurrency} />
                </div>
                <Text size="small" className="font-medium">
                  Top variants (by revenue)
                </Text>
                <AnalyticsPaginatedList
                  items={(products.data as any).top_variants || []}
                  pageSize={5}
                  itemLabel="variants"
                  renderItem={(v: { product_title?: string; quantity: number; revenue: number; variant_id?: string }) =>
                    `${v.product_title ?? "—"}: qty ${formatNumber(v.quantity)}, revenue ${formatCurrency(v.revenue, storeCurrency)}`
                  }
                />
              </div>
            ) : null}
          </AnalyticsCard>

          <AnalyticsCard
            title="Customer origin"
            loading={customerOrigin.isLoading}
            error={customerOrigin.error}
            empty={
              !customerOrigin.data ||
              !(typeof customerOrigin.data === "object" && "by_origin" in customerOrigin.data) ||
              Object.keys((customerOrigin.data as any).by_origin || {}).length === 0
            }
            emptyMessage="No origin data yet. Enable customer-origin capture on the storefront."
          >
            {customerOrigin.data && typeof customerOrigin.data === "object" && "by_origin" in customerOrigin.data ? (
              <AnalyticsPaginatedList
                items={Object.entries((customerOrigin.data as any).by_origin || {})}
                pageSize={8}
                itemLabel="origins"
                listStyle="badges"
                renderItem={([origin, count]) => (
                  <Badge size="large">
                    {origin}: {String(count)}
                  </Badge>
                )}
              />
            ) : null}
          </AnalyticsCard>

          {!posthogUrl && (
            <Text size="small" className="text-ui-fg-muted">
              Configure the PostHog dashboard URL in{" "}
              <Link to="/settings/analytics" className="text-ui-fg-interactive hover:underline">
                Settings &gt; Analytics
              </Link>{" "}
              to embed your PostHog dashboard in a Product analytics tab.
            </Text>
          )}
        </div>
      )}
    </Container>
  )
}

function Stat({
  label,
  value,
  format,
  compact,
  currency = "EUR",
}: {
  label: string
  value: number | undefined
  format?: "currency"
  compact?: boolean
  currency?: string
}) {
  const display =
    value == null
      ? "—"
      : format === "currency"
        ? typeof value === "number"
          ? formatCurrency(value, currency)
          : String(value)
        : formatNumber(Number(value))
  return (
    <div>
      <Text size="small" className="text-ui-fg-muted">
        {label}
      </Text>
      <Text weight="plus" size={compact ? "base" : "large"} className={compact ? "block mt-0.5" : "block mt-1"}>
        {display}
      </Text>
    </div>
  )
}
