/**
 * Analytics API service. Reuses query patterns from analytics-mcp; used by admin analytics routes.
 */

export default class AnalyticsApiService {
  protected readonly query_: any
  protected readonly logger_: any

  constructor({ query, logger }: { query: any; logger: any }) {
    this.query_ = query
    this.logger_ = logger
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  async getCartSummary(params: { days?: number } = {}) {
    const days = params.days ?? 30
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data: carts } = await this.query_.graph({
      entity: "cart",
      fields: [
        "id",
        "total",
        "subtotal",
        "item_total",
        "completed_at",
        "updated_at",
        "items.*",
      ],
      filters: {
        updated_at: { $gte: since },
      },
    })

    const withItems = carts.filter((c: any) => c.items?.length > 0)
    const abandoned = withItems.filter((c: any) => !c.completed_at)
    const completed = withItems.filter((c: any) => c.completed_at)

    const totalValue = withItems.reduce((sum: number, c: any) => sum + (c.total ?? c.subtotal ?? 0), 0)
    const abandonedValue = abandoned.reduce((sum: number, c: any) => sum + (c.total ?? c.subtotal ?? 0), 0)

    const buckets: Record<string, number> = {
      "0-50": 0,
      "50-100": 0,
      "100-200": 0,
      "200-500": 0,
      "500+": 0,
    }
    withItems.forEach((c: any) => {
      const v = c.total ?? c.subtotal ?? 0
      if (v < 50) buckets["0-50"]++
      else if (v < 100) buckets["50-100"]++
      else if (v < 200) buckets["100-200"]++
      else if (v < 500) buckets["200-500"]++
      else buckets["500+"]++
    })

    return {
      period_days: days,
      total_carts: withItems.length,
      abandoned_count: abandoned.length,
      completed_count: completed.length,
      average_cart_value: withItems.length ? totalValue / withItems.length : 0,
      abandoned_average_value: abandoned.length ? abandonedValue / abandoned.length : 0,
      breakdown_by_value: buckets,
    }
  }

  async getOrdersByStatus(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: ["id", "status", "total", "items.*"],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    const byStatus: Record<string, { count: number; total: number }> = {}
    let totalUnits = 0
    orders.forEach((o: any) => {
      const status = o.status || "unknown"
      if (!byStatus[status]) byStatus[status] = { count: 0, total: 0 }
      byStatus[status].count++
      byStatus[status].total += o.total ?? 0
      o.items?.forEach((item: any) => {
        totalUnits += item.quantity ?? 0
      })
    })

    return {
      by_status: byStatus,
      total_orders: orders.length,
      average_units_per_order: orders.length ? totalUnits / orders.length : 0,
      period: { start_date: params.start_date, end_date: params.end_date },
    }
  }

  async getOrdersByTime(params: { start_date: string; end_date: string; group_by: "day" | "week" | "month" }) {
    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: ["id", "created_at", "total", "status"],
      filters: {
        created_at: {
          $gte: new Date(params.start_date),
          $lte: new Date(params.end_date),
        },
      },
    })

    const grouped: Record<string, { orders: number; total: number }> = {}
    orders.forEach((order: any) => {
      const date = new Date(order.created_at)
      let key: string
      switch (params.group_by) {
        case "day":
          key = date.toISOString().split("T")[0]
          break
        case "week":
          key = `${date.getFullYear()}-W${this.getWeekNumber(date)}`
          break
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          break
        default:
          key = date.toISOString().split("T")[0]
      }
      if (!grouped[key]) grouped[key] = { orders: 0, total: 0 }
      grouped[key].orders++
      grouped[key].total += order.total ?? 0
    })

    const chart = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, ...data }))

    return { chart, period: params }
  }

  async getRefundsSummary(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: ["id", "created_at", "transactions.*"],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    let totalRefunded = 0
    const byPeriod: Record<string, number> = {}
    orders.forEach((order: any) => {
      const refunds = order.transactions?.filter((t: any) => t.reference === "refund") ?? []
      refunds.forEach((t: any) => {
        const amount = Math.abs(t.amount ?? 0)
        totalRefunded += amount
        const key = new Date(order.created_at).toISOString().split("T")[0]
        byPeriod[key] = (byPeriod[key] ?? 0) + amount
      })
    })

    const by_time = Object.entries(byPeriod)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }))

    return {
      total_refunded: totalRefunded,
      refund_count: orders.reduce(
        (acc: number, o: any) => acc + (o.transactions?.filter((t: any) => t.reference === "refund").length ?? 0),
        0
      ),
      by_time,
      period: params,
    }
  }

  async getSalesSummary(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "total",
        "subtotal",
        "discount_total",
        "currency_code",
        "sales_channel_id",
        "created_at",
        "transactions.*",
      ],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    const totalSales = orders.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0)
    const totalRefunded = orders.reduce((sum: number, o: any) => {
      const refunds = o.transactions?.filter((t: any) => t.reference === "refund") ?? []
      return sum + refunds.reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0)
    }, 0)
    const netSales = totalSales - totalRefunded

    const byChannel: Record<string, { orders: number; total: number }> = {}
    const byCurrency: Record<string, number> = {}
    orders.forEach((o: any) => {
      const ch = o.sales_channel_id ?? "default"
      if (!byChannel[ch]) byChannel[ch] = { orders: 0, total: 0 }
      byChannel[ch].orders++
      byChannel[ch].total += o.total ?? 0
      const curr = o.currency_code ?? "USD"
      byCurrency[curr] = (byCurrency[curr] ?? 0) + (o.total ?? 0)
    })

    return {
      total_sales: totalSales,
      net_sales: netSales,
      total_refunded: totalRefunded,
      order_count: orders.length,
      average_sales: orders.length ? totalSales / orders.length : 0,
      by_channel: byChannel,
      by_currency: byCurrency,
      period: params,
    }
  }

  async getSalesChart(params: { start_date: string; end_date: string; group_by: "day" | "week" | "month" }) {
    return this.getOrdersByTime({
      start_date: params.start_date,
      end_date: params.end_date,
      group_by: params.group_by,
    })
  }

  async getCustomersSummary(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: customers } = await this.query_.graph({
      entity: "customer",
      fields: ["id", "created_at", "orders.*", "orders.total", "orders.created_at"],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    let totalSpentAll = 0
    let repeatCount = 0
    const newByTime: Record<string, number> = {}
    customers.forEach((c: any) => {
      const orders = c.orders ?? []
      const spent = orders.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0)
      totalSpentAll += spent
      if (orders.length > 1) repeatCount++
      const key = new Date(c.created_at).toISOString().split("T")[0]
      newByTime[key] = (newByTime[key] ?? 0) + 1
    })

    const customerCount = customers.length
    const avgSalesPerCustomer = customerCount ? totalSpentAll / customerCount : 0
    const repeatRate = customerCount ? (repeatCount / customerCount) * 100 : 0

    const byTime = Object.entries(newByTime)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, new_customers: count }))

    let cumulative = 0
    const cumulativeByTime = byTime.map(({ date, new_customers }) => {
      cumulative += new_customers
      return { date, cumulative_customers: cumulative }
    })

    return {
      total_customers: customerCount,
      average_sales_per_customer: avgSalesPerCustomer,
      repeat_customer_rate: repeatRate,
      new_customers_by_time: byTime,
      cumulative_customers_by_time: cumulativeByTime,
      period: params,
    }
  }

  async getRegionsPopularity(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: ["id", "total", "region.id", "region.name", "region.currency_code"],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    const byRegion: Record<string, { name: string; orders: number; total: number; currency_code: string }> = {}
    orders.forEach((o: any) => {
      const id = o.region?.id ?? "unknown"
      if (!byRegion[id]) {
        byRegion[id] = {
          name: o.region?.name ?? "Unknown",
          orders: 0,
          total: 0,
          currency_code: o.region?.currency_code ?? "USD",
        }
      }
      byRegion[id].orders++
      byRegion[id].total += o.total ?? 0
    })

    const regions = Object.entries(byRegion)
      .map(([id, data]) => ({ region_id: id, ...data }))
      .sort((a, b) => b.total - a.total)

    return { regions, period: params }
  }

  async getSalesChannelPopularity(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: ["id", "total", "sales_channel_id"],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    const byChannel: Record<string, { orders: number; total: number }> = {}
    orders.forEach((o: any) => {
      const id = o.sales_channel_id ?? "default"
      if (!byChannel[id]) byChannel[id] = { orders: 0, total: 0 }
      byChannel[id].orders++
      byChannel[id].total += o.total ?? 0
    })

    const channels = Object.entries(byChannel).map(([id, data]) => ({ sales_channel_id: id, ...data }))
    return { channels, period: params }
  }

  async getPaymentProviderPopularity(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    let orders: any[] = []
    try {
      const result = await this.query_.graph({
        entity: "order",
        fields: [
          "id",
          "total",
          "payment_collections.*",
          "payment_collections.payment_sessions.*",
          "payment_collections.payment_sessions.provider_id",
          "payment_collections.payments.*",
          "payment_collections.payments.provider_id",
        ],
        filters: Object.keys(filters).length ? filters : undefined,
      })
      orders = result.data ?? []
    } catch (e) {
      this.logger_?.warn?.(e, "[Analytics] Payment provider query with payment_collections failed, falling back to totals only")
      const fallback = await this.query_.graph({
        entity: "order",
        fields: ["id", "total"],
        filters: Object.keys(filters).length ? filters : undefined,
      })
      orders = fallback.data ?? []
    }

    const byProvider: Record<string, { orders: number; total: number }> = {}
    for (const o of orders) {
      const orderTotal = o.total ?? 0
      let providerId: string | null = null
      const collections = o.payment_collections ?? []
      for (const pc of collections) {
        const payments = pc.payments ?? []
        const session = (pc.payment_sessions ?? []).find((s: any) => s.status === "captured" || s.status === "authorized")
        if (session?.provider_id) {
          providerId = session.provider_id
          break
        }
        if (payments.length > 0 && payments[0].provider_id) {
          providerId = payments[0].provider_id
          break
        }
        if ((pc.payment_sessions ?? []).length > 0 && (pc.payment_sessions as any)[0].provider_id) {
          providerId = (pc.payment_sessions as any)[0].provider_id
          break
        }
      }
      const key = providerId ?? "unknown"
      if (!byProvider[key]) byProvider[key] = { orders: 0, total: 0 }
      byProvider[key].orders += 1
      byProvider[key].total += orderTotal
    }

    const providers = Object.entries(byProvider)
      .map(([provider_id, data]) => ({ provider_id, ...data }))
      .sort((a, b) => b.total - a.total)
    return { providers, period: params }
  }

  async getPromotionsSummary(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: ["id", "discount_total", "promotions.*", "promotions.code"],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    const totalPromotions = orders.reduce((sum: number, o: any) => sum + (o.discount_total ?? 0), 0)
    const ordersWithPromo = orders.filter((o: any) => (o.discount_total ?? 0) > 0).length
    const byCode: Record<string, { orders: number; discount_total: number }> = {}
    orders.forEach((o: any) => {
      const promos = o.promotions ?? []
      promos.forEach((p: any) => {
        const code = p.code ?? "unknown"
        if (!byCode[code]) byCode[code] = { orders: 0, discount_total: 0 }
        byCode[code].orders++
        byCode[code].discount_total += o.discount_total ?? 0
      })
      if (promos.length === 0 && (o.discount_total ?? 0) > 0) {
        const code = "manual"
        if (!byCode[code]) byCode[code] = { orders: 0, discount_total: 0 }
        byCode[code].orders++
        byCode[code].discount_total += o.discount_total ?? 0
      }
    })

    const top_discounts = Object.entries(byCode)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.discount_total - a.discount_total)
      .slice(0, 20)

    return {
      total_promotions_amount: totalPromotions,
      orders_with_promotions: ordersWithPromo,
      top_discounts,
      period: params,
    }
  }

  async getProductsSummary(params: { start_date?: string; end_date?: string; limit?: number } = {}) {
    const limit = params.limit ?? 10
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "items.*",
        "items.variant_id",
        "items.product_id",
        "items.product_title",
        "items.quantity",
        "items.unit_price",
        "items.subtotal",
        "items.total",
      ],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    /** Coerce line total to number; Medusa may return BigNumber/object with .value or .raw */
    const toLineRevenue = (item: any): number => {
      const total = item.total ?? item.subtotal
      if (total != null && typeof total === "object") {
        const v = (total as any).value ?? (total as any).raw
        if (v != null) return Number(v)
      }
      if (typeof total === "number" && !Number.isNaN(total)) return total
      if (typeof total === "string") return Number(total) || 0
      const qty = Number(item.quantity) || 0
      const unit = item.unit_price
      const unitNum =
        unit != null && typeof unit === "object"
          ? Number((unit as any).value ?? (unit as any).raw) || 0
          : Number(unit) || 0
      return unitNum * qty
    }

    const variantStats: Record<
      string,
      { variant_id: string; product_id: string; product_title: string; quantity: number; revenue: number }
    > = {}
    orders.forEach((o: any) => {
      o.items?.forEach((item: any) => {
        const vid = item.variant_id ?? item.product_id
        if (!vid) return
        if (!variantStats[vid]) {
          variantStats[vid] = {
            variant_id: vid,
            product_id: item.product_id ?? "",
            product_title: item.product_title ?? "",
            quantity: 0,
            revenue: 0,
          }
        }
        variantStats[vid].quantity += Number(item.quantity) || 0
        variantStats[vid].revenue += toLineRevenue(item)
      })
    })

    const topVariants = Object.values(variantStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)

    const { data: products } = await this.query_.graph({
      entity: "product",
      fields: ["id", "variants.*", "variants.inventory_quantity", "variants.manage_inventory"],
    })

    const outOfStock = products.filter((p: any) =>
      p.variants?.some((v: any) => v.manage_inventory && (v.inventory_quantity ?? 0) <= 0)
    ).length

    const productsSoldCount = new Set(orders.flatMap((o: any) => o.items?.map((i: any) => i.product_id).filter(Boolean) ?? [])).size

    return {
      top_variants: topVariants,
      products_sold_count: productsSoldCount,
      out_of_stock_variants_count: outOfStock,
      period: params,
    }
  }

  async getCustomerOriginBreakdown(params: { start_date?: string; end_date?: string } = {}) {
    const filters: any = {}
    if (params.start_date || params.end_date) {
      filters.created_at = {}
      if (params.start_date) filters.created_at.$gte = new Date(params.start_date)
      if (params.end_date) filters.created_at.$lte = new Date(params.end_date)
    }

    const { data: customers } = await this.query_.graph({
      entity: "customer",
      fields: ["id", "created_at", "metadata"],
      filters: Object.keys(filters).length ? filters : undefined,
    })

    const byOrigin: Record<string, number> = {}
    customers.forEach((c: any) => {
      const origin = (c.metadata?.origin_type as string) || "unknown"
      byOrigin[origin] = (byOrigin[origin] ?? 0) + 1
    })

    const cartFilters: any = {}
    if (params.start_date || params.end_date) {
      cartFilters.updated_at = {}
      if (params.start_date) cartFilters.updated_at.$gte = new Date(params.start_date)
      if (params.end_date) cartFilters.updated_at.$lte = new Date(params.end_date)
    } else {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      cartFilters.updated_at = { $gte: since }
    }

    const { data: carts } = await this.query_.graph({
      entity: "cart",
      fields: ["id", "metadata", "updated_at"],
      filters: cartFilters,
    })

    const cartsWithOrigin = carts.filter((c: any) => c.metadata?.origin_type).length

    return {
      by_origin: byOrigin,
      total_customers: customers.length,
      total_carts: carts.length,
      carts_with_origin: cartsWithOrigin,
      period: { start_date: params.start_date, end_date: params.end_date },
    }
  }
}
