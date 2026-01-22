import { MCPTool } from "./types"

export default class AnalyticsMcpService {
  protected readonly query_: any
  protected readonly logger_: any

  constructor({ query, logger }: { query: any; logger: any }) {
    this.query_ = query
    this.logger_ = logger
  }

  /**
   * Get all available MCP tools for Ollama function calling
   */
  getTools(): MCPTool[] {
    return [
      // Product Tools
      {
        name: "get_products",
        description: "List products with optional filters (status, limit, offset)",
        inputSchema: {
          type: "object",
          properties: {
            status: { 
              type: "string", 
              enum: ["draft", "published", "rejected"],
              description: "Filter by product status" 
            },
            limit: { type: "number", description: "Maximum number of products to return (default: 10)" },
            offset: { type: "number", description: "Number of products to skip (default: 0)" }
          },
          required: []
        }
      },
      {
        name: "get_product_by_id",
        description: "Get detailed information about a specific product by ID",
        inputSchema: {
          type: "object",
          properties: {
            product_id: { type: "string", description: "Product ID" }
          },
          required: ["product_id"]
        }
      },
      {
        name: "search_products",
        description: "Search products by title or description",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Maximum results (default: 10)" }
          },
          required: ["query"]
        }
      },
      {
        name: "get_top_products",
        description: "Get best-selling products by revenue or quantity sold",
        inputSchema: {
          type: "object",
          properties: {
            sort_by: { 
              type: "string", 
              enum: ["revenue", "quantity"],
              description: "Sort by revenue or quantity" 
            },
            start_date: { type: "string", description: "Start date (ISO 8601 format YYYY-MM-DD)" },
            end_date: { type: "string", description: "End date (ISO 8601 format YYYY-MM-DD)" },
            limit: { type: "number", description: "Number of products to return (default: 10)" }
          },
          required: ["start_date", "end_date"]
        }
      },
      // Order Tools
      {
        name: "get_orders",
        description: "List orders with optional filters (status, date range, region)",
        inputSchema: {
          type: "object",
          properties: {
            status: { 
              type: "string",
              description: "Filter by order status (pending, completed, canceled, etc.)" 
            },
            region_id: { type: "string", description: "Filter by region ID" },
            limit: { type: "number", description: "Maximum orders to return (default: 10)" },
            offset: { type: "number", description: "Number of orders to skip (default: 0)" }
          },
          required: []
        }
      },
      {
        name: "get_order_by_id",
        description: "Get detailed information about a specific order by ID",
        inputSchema: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "Order ID" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "get_orders_by_period",
        description: "Get all orders within a specific date range with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            start_date: { type: "string", description: "Start date (ISO 8601 format YYYY-MM-DD)" },
            end_date: { type: "string", description: "End date (ISO 8601 format YYYY-MM-DD)" },
            status: { type: "string", description: "Optional order status filter" },
            region_id: { type: "string", description: "Optional region ID filter" }
          },
          required: ["start_date", "end_date"]
        }
      },
      {
        name: "get_revenue_by_period",
        description: "Calculate total revenue for a specific time period",
        inputSchema: {
          type: "object",
          properties: {
            start_date: { type: "string", description: "Start date (ISO 8601 format YYYY-MM-DD)" },
            end_date: { type: "string", description: "End date (ISO 8601 format YYYY-MM-DD)" },
            region_id: { type: "string", description: "Optional region ID filter" }
          },
          required: ["start_date", "end_date"]
        }
      },
      // Customer Tools
      {
        name: "get_customers",
        description: "List customers with optional filters and pagination",
        inputSchema: {
          type: "object",
          properties: {
            has_account: { type: "boolean", description: "Filter by whether customer has an account" },
            limit: { type: "number", description: "Maximum customers to return (default: 10)" },
            offset: { type: "number", description: "Number of customers to skip (default: 0)" }
          },
          required: []
        }
      },
      {
        name: "get_customer_by_id",
        description: "Get detailed information about a specific customer including order history",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "Customer ID" }
          },
          required: ["customer_id"]
        }
      },
      {
        name: "get_inactive_customers",
        description: "Get customers who haven't ordered in a specified number of days",
        inputSchema: {
          type: "object",
          properties: {
            days: { type: "number", description: "Number of days of inactivity (e.g., 60)" }
          },
          required: ["days"]
        }
      },
      // Analytics Tools
      {
        name: "compare_periods",
        description: "Compare metrics (revenue, orders, AOV) between two time periods",
        inputSchema: {
          type: "object",
          properties: {
            metric: { 
              type: "string", 
              enum: ["revenue", "orders", "aov", "customers"],
              description: "Metric to compare (revenue, orders, AOV, customers)" 
            },
            period1_start: { type: "string", description: "Period 1 start date (ISO 8601)" },
            period1_end: { type: "string", description: "Period 1 end date (ISO 8601)" },
            period2_start: { type: "string", description: "Period 2 start date (ISO 8601)" },
            period2_end: { type: "string", description: "Period 2 end date (ISO 8601)" }
          },
          required: ["metric", "period1_start", "period1_end", "period2_start", "period2_end"]
        }
      },
      {
        name: "get_sales_trends",
        description: "Get sales data grouped by day, week, or month",
        inputSchema: {
          type: "object",
          properties: {
            start_date: { type: "string", description: "Start date (ISO 8601)" },
            end_date: { type: "string", description: "End date (ISO 8601)" },
            group_by: { 
              type: "string", 
              enum: ["day", "week", "month"],
              description: "Group results by day, week, or month" 
            }
          },
          required: ["start_date", "end_date", "group_by"]
        }
      },
      {
        name: "calculate_aov",
        description: "Calculate average order value for a specific time period",
        inputSchema: {
          type: "object",
          properties: {
            start_date: { type: "string", description: "Start date (ISO 8601)" },
            end_date: { type: "string", description: "End date (ISO 8601)" }
          },
          required: ["start_date", "end_date"]
        }
      },
      {
        name: "get_revenue_by_region",
        description: "Get revenue breakdown by region for a specific time period",
        inputSchema: {
          type: "object",
          properties: {
            start_date: { type: "string", description: "Start date (ISO 8601)" },
            end_date: { type: "string", description: "End date (ISO 8601)" }
          },
          required: ["start_date", "end_date"]
        }
      },
      // Inventory Tools
      {
        name: "get_inventory_status",
        description: "Get current inventory status for all products",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Maximum products to return (default: 20)" }
          },
          required: []
        }
      },
      {
        name: "get_low_stock_products",
        description: "Get products below a specified stock threshold",
        inputSchema: {
          type: "object",
          properties: {
            threshold: { type: "number", description: "Stock threshold (default: 10)" }
          },
          required: []
        }
      }
    ]
  }

  /**
   * Execute a tool by name with parameters
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    this.logger_.info(`[ANALYTICS MCP] Executing tool: ${toolName}`, params)

    try {
      switch (toolName) {
        // Product Tools
        case "get_products":
          return await this.getProducts(params)
        case "get_product_by_id":
          return await this.getProductById(params)
        case "search_products":
          return await this.searchProducts(params)
        case "get_top_products":
          return await this.getTopProducts(params)
        
        // Order Tools
        case "get_orders":
          return await this.getOrders(params)
        case "get_order_by_id":
          return await this.getOrderById(params)
        case "get_orders_by_period":
          return await this.getOrdersByPeriod(params)
        case "get_revenue_by_period":
          return await this.getRevenueByPeriod(params)
        
        // Customer Tools
        case "get_customers":
          return await this.getCustomers(params)
        case "get_customer_by_id":
          return await this.getCustomerById(params)
        case "get_inactive_customers":
          return await this.getInactiveCustomers(params)
        
        // Analytics Tools
        case "compare_periods":
          return await this.comparePeriods(params)
        case "get_sales_trends":
          return await this.getSalesTrends(params)
        case "calculate_aov":
          return await this.calculateAOV(params)
        case "get_revenue_by_region":
          return await this.getRevenueByRegion(params)
        
        // Inventory Tools
        case "get_inventory_status":
          return await this.getInventoryStatus(params)
        case "get_low_stock_products":
          return await this.getLowStockProducts(params)
        
        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      this.logger_.error(`[ANALYTICS MCP] Tool execution failed:`, error)
      throw error
    }
  }

  // ===== Product Tools =====

  private async getProducts({ status, limit = 10, offset = 0 }: any) {
    const filters: any = {}
    if (status) filters.status = status

    const { data: products } = await this.query_.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "status",
        "handle",
        "description",
        "thumbnail",
        "created_at",
        "updated_at",
        "variants.*"
      ],
      filters,
      pagination: { skip: offset, take: limit }
    })

    return {
      products,
      count: products.length,
      offset,
      limit
    }
  }

  private async getProductById({ product_id }: any) {
    const { data: products } = await this.query_.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "subtitle",
        "description",
        "handle",
        "status",
        "thumbnail",
        "images.*",
        "variants.*",
        "variants.inventory_quantity",
        "options.*",
        "tags.*",
        "collection.*",
        "categories.*"
      ],
      filters: { id: product_id }
    })

    if (!products || products.length === 0) {
      throw new Error(`Product not found: ${product_id}`)
    }

    return { product: products[0] }
  }

  private async searchProducts({ query, limit = 10 }: any) {
    const { data: products } = await this.query_.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "handle",
        "thumbnail",
        "status"
      ],
      filters: {
        $or: [
          { title: { $ilike: `%${query}%` } },
          { description: { $ilike: `%${query}%` } }
        ]
      },
      pagination: { take: limit }
    })

    return {
      products,
      count: products.length,
      query
    }
  }

  private async getTopProducts({ sort_by = "revenue", start_date, end_date, limit = 10 }: any) {
    // Get orders in period
    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "items.*",
        "items.product_id",
        "items.product_title",
        "items.quantity",
        "items.unit_price",
        "items.subtotal"
      ],
      filters: {
        created_at: {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        }
      }
    })

    // Aggregate by product
    const productStats: Record<string, any> = {}
    
    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const productId = item.product_id
        if (!productId) return

        if (!productStats[productId]) {
          productStats[productId] = {
            product_id: productId,
            product_title: item.product_title,
            total_quantity: 0,
            total_revenue: 0
          }
        }

        productStats[productId].total_quantity += item.quantity || 0
        productStats[productId].total_revenue += item.subtotal || 0
      })
    })

    // Convert to array and sort
    const sortField = sort_by === "quantity" ? "total_quantity" : "total_revenue"
    const topProducts = Object.values(productStats)
      .sort((a: any, b: any) => b[sortField] - a[sortField])
      .slice(0, limit)

    return {
      products: topProducts,
      sort_by,
      period: { start_date, end_date },
      count: topProducts.length
    }
  }

  // ===== Order Tools =====

  private async getOrders({ status, region_id, limit = 10, offset = 0 }: any) {
    const filters: any = {}
    if (status) filters.status = status
    if (region_id) filters.region_id = region_id

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "created_at",
        "total",
        "subtotal",
        "tax_total",
        "currency_code",
        "customer.email",
        "customer.first_name",
        "customer.last_name",
        "region.name"
      ],
      filters,
      pagination: { skip: offset, take: limit }
    })

    return {
      orders,
      count: orders.length,
      offset,
      limit
    }
  }

  private async getOrderById({ order_id }: any) {
    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "created_at",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "currency_code",
        "customer.*",
        "items.*",
        "items.product_title",
        "items.variant_title",
        "shipping_address.*",
        "billing_address.*",
        "payments.*",
        "fulfillments.*"
      ],
      filters: { id: order_id }
    })

    if (!orders || orders.length === 0) {
      throw new Error(`Order not found: ${order_id}`)
    }

    return { order: orders[0] }
  }

  private async getOrdersByPeriod({ start_date, end_date, status, region_id }: any) {
    const filters: any = {
      created_at: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    }
    if (status) filters.status = status
    if (region_id) filters.region_id = region_id

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "created_at",
        "total",
        "currency_code",
        "items.*",
        "customer.email"
      ],
      filters
    })

    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)

    return {
      orders,
      count: orders.length,
      total_revenue: totalRevenue,
      period: { start_date, end_date }
    }
  }

  private async getRevenueByPeriod({ start_date, end_date, region_id }: any) {
    const filters: any = {
      created_at: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    }
    if (region_id) filters.region_id = region_id

    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "currency_code"
      ],
      filters
    })

    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)
    const totalSubtotal = orders.reduce((sum: number, order: any) => sum + (order.subtotal || 0), 0)
    const totalTax = orders.reduce((sum: number, order: any) => sum + (order.tax_total || 0), 0)
    const totalShipping = orders.reduce((sum: number, order: any) => sum + (order.shipping_total || 0), 0)

    return {
      total_revenue: totalRevenue,
      total_subtotal: totalSubtotal,
      total_tax: totalTax,
      total_shipping: totalShipping,
      order_count: orders.length,
      period: { start_date, end_date },
      currency_code: orders[0]?.currency_code || "USD"
    }
  }

  // ===== Customer Tools =====

  private async getCustomers({ has_account, limit = 10, offset = 0 }: any) {
    const filters: any = {}
    if (typeof has_account === "boolean") {
      filters.has_account = has_account
    }

    const { data: customers } = await this.query_.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "first_name",
        "last_name",
        "phone",
        "has_account",
        "created_at"
      ],
      filters,
      pagination: { skip: offset, take: limit }
    })

    return {
      customers,
      count: customers.length,
      offset,
      limit
    }
  }

  private async getCustomerById({ customer_id }: any) {
    const { data: customers } = await this.query_.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "first_name",
        "last_name",
        "phone",
        "has_account",
        "created_at",
        "orders.*",
        "orders.total",
        "orders.created_at",
        "orders.status"
      ],
      filters: { id: customer_id }
    })

    if (!customers || customers.length === 0) {
      throw new Error(`Customer not found: ${customer_id}`)
    }

    const customer = customers[0]
    const totalSpent = customer.orders?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0
    const orderCount = customer.orders?.length || 0

    return {
      customer,
      total_spent: totalSpent,
      order_count: orderCount
    }
  }

  private async getInactiveCustomers({ days }: any) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Get all customers
    const { data: customers } = await this.query_.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "first_name",
        "last_name",
        "created_at",
        "orders.*",
        "orders.created_at"
      ]
    })

    // Filter customers whose last order is older than cutoff date
    const inactiveCustomers = customers.filter((customer: any) => {
      if (!customer.orders || customer.orders.length === 0) {
        // Customer never ordered - check if account created before cutoff
        return new Date(customer.created_at) < cutoffDate
      }

      // Find most recent order
      const lastOrderDate = customer.orders.reduce((latest: Date, order: any) => {
        const orderDate = new Date(order.created_at)
        return orderDate > latest ? orderDate : latest
      }, new Date(0))

      return lastOrderDate < cutoffDate
    })

    return {
      customers: inactiveCustomers.map((c: any) => ({
        id: c.id,
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
        last_order_date: c.orders?.[0] ? new Date(Math.max(...c.orders.map((o: any) => new Date(o.created_at).getTime()))) : null,
        days_inactive: days
      })),
      count: inactiveCustomers.length,
      days_threshold: days
    }
  }

  // ===== Analytics Tools =====

  private async comparePeriods({ metric, period1_start, period1_end, period2_start, period2_end }: any) {
    let period1Data: any
    let period2Data: any

    switch (metric) {
      case "revenue":
        period1Data = await this.getRevenueByPeriod({ start_date: period1_start, end_date: period1_end })
        period2Data = await this.getRevenueByPeriod({ start_date: period2_start, end_date: period2_end })
        
        const revenueDiff = period1Data.total_revenue - period2Data.total_revenue
        const revenueGrowth = period2Data.total_revenue > 0 
          ? ((revenueDiff / period2Data.total_revenue) * 100).toFixed(2) 
          : "N/A"

        return {
          metric: "revenue",
          period1: {
            value: period1Data.total_revenue,
            orders: period1Data.order_count,
            dates: { start: period1_start, end: period1_end }
          },
          period2: {
            value: period2Data.total_revenue,
            orders: period2Data.order_count,
            dates: { start: period2_start, end: period2_end }
          },
          difference: revenueDiff,
          growth_percentage: revenueGrowth
        }

      case "orders":
        period1Data = await this.getOrdersByPeriod({ start_date: period1_start, end_date: period1_end })
        period2Data = await this.getOrdersByPeriod({ start_date: period2_start, end_date: period2_end })
        
        const orderDiff = period1Data.count - period2Data.count
        const orderGrowth = period2Data.count > 0 
          ? ((orderDiff / period2Data.count) * 100).toFixed(2) 
          : "N/A"

        return {
          metric: "orders",
          period1: {
            value: period1Data.count,
            revenue: period1Data.total_revenue,
            dates: { start: period1_start, end: period1_end }
          },
          period2: {
            value: period2Data.count,
            revenue: period2Data.total_revenue,
            dates: { start: period2_start, end: period2_end }
          },
          difference: orderDiff,
          growth_percentage: orderGrowth
        }

      case "aov":
        period1Data = await this.calculateAOV({ start_date: period1_start, end_date: period1_end })
        period2Data = await this.calculateAOV({ start_date: period2_start, end_date: period2_end })
        
        const aovDiff = period1Data.average_order_value - period2Data.average_order_value
        const aovGrowth = period2Data.average_order_value > 0 
          ? ((aovDiff / period2Data.average_order_value) * 100).toFixed(2) 
          : "N/A"

        return {
          metric: "aov",
          period1: {
            value: period1Data.average_order_value,
            orders: period1Data.order_count,
            dates: { start: period1_start, end: period1_end }
          },
          period2: {
            value: period2Data.average_order_value,
            orders: period2Data.order_count,
            dates: { start: period2_start, end: period2_end }
          },
          difference: aovDiff,
          growth_percentage: aovGrowth
        }

      default:
        throw new Error(`Unknown metric: ${metric}`)
    }
  }

  private async getSalesTrends({ start_date, end_date, group_by }: any) {
    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "created_at",
        "total",
        "status"
      ],
      filters: {
        created_at: {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        }
      }
    })

    // Group orders by time period
    const grouped: Record<string, any> = {}

    orders.forEach((order: any) => {
      const date = new Date(order.created_at)
      let key: string

      switch (group_by) {
        case "day":
          key = date.toISOString().split('T')[0]
          break
        case "week":
          const weekNum = this.getWeekNumber(date)
          key = `${date.getFullYear()}-W${weekNum}`
          break
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          revenue: 0,
          orders: 0
        }
      }

      grouped[key].revenue += order.total || 0
      grouped[key].orders += 1
    })

    const trends = Object.values(grouped).sort((a: any, b: any) => 
      a.period.localeCompare(b.period)
    )

    return {
      trends,
      group_by,
      period: { start_date, end_date },
      total_periods: trends.length
    }
  }

  private async calculateAOV({ start_date, end_date }: any) {
    const revenueData = await this.getRevenueByPeriod({ start_date, end_date })
    
    const aov = revenueData.order_count > 0 
      ? revenueData.total_revenue / revenueData.order_count 
      : 0

    return {
      average_order_value: Math.round(aov * 100) / 100,
      total_revenue: revenueData.total_revenue,
      order_count: revenueData.order_count,
      period: { start_date, end_date }
    }
  }

  private async getRevenueByRegion({ start_date, end_date }: any) {
    const { data: orders } = await this.query_.graph({
      entity: "order",
      fields: [
        "id",
        "total",
        "region.id",
        "region.name",
        "region.currency_code"
      ],
      filters: {
        created_at: {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        }
      }
    })

    // Group by region
    const regionStats: Record<string, any> = {}

    orders.forEach((order: any) => {
      const regionId = order.region?.id || "unknown"
      const regionName = order.region?.name || "Unknown Region"

      if (!regionStats[regionId]) {
        regionStats[regionId] = {
          region_id: regionId,
          region_name: regionName,
          total_revenue: 0,
          order_count: 0,
          currency_code: order.region?.currency_code || "USD"
        }
      }

      regionStats[regionId].total_revenue += order.total || 0
      regionStats[regionId].order_count += 1
    })

    const regions = Object.values(regionStats).sort((a: any, b: any) => 
      b.total_revenue - a.total_revenue
    )

    return {
      regions,
      period: { start_date, end_date },
      total_regions: regions.length
    }
  }

  // ===== Inventory Tools =====

  private async getInventoryStatus({ limit = 20 }: any) {
    const { data: products } = await this.query_.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "status",
        "variants.*",
        "variants.title",
        "variants.sku",
        "variants.inventory_quantity",
        "variants.manage_inventory",
        "variants.allow_backorder"
      ],
      pagination: { take: limit }
    })

    const inventory = products.map((product: any) => ({
      product_id: product.id,
      product_title: product.title,
      variants: product.variants?.map((v: any) => ({
        variant_id: v.id,
        variant_title: v.title,
        sku: v.sku,
        inventory_quantity: v.inventory_quantity || 0,
        manage_inventory: v.manage_inventory,
        allow_backorder: v.allow_backorder
      }))
    }))

    return {
      products: inventory,
      count: inventory.length
    }
  }

  private async getLowStockProducts({ threshold = 10 }: any) {
    const { data: products } = await this.query_.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "status",
        "variants.*",
        "variants.title",
        "variants.sku",
        "variants.inventory_quantity",
        "variants.manage_inventory"
      ]
    })

    const lowStockProducts = products.filter((product: any) => 
      product.variants?.some((v: any) => 
        v.manage_inventory && 
        (v.inventory_quantity || 0) < threshold &&
        (v.inventory_quantity || 0) > 0
      )
    ).map((product: any) => ({
      product_id: product.id,
      product_title: product.title,
      low_stock_variants: product.variants
        ?.filter((v: any) => 
          v.manage_inventory && 
          (v.inventory_quantity || 0) < threshold &&
          (v.inventory_quantity || 0) > 0
        )
        .map((v: any) => ({
          variant_id: v.id,
          variant_title: v.title,
          sku: v.sku,
          inventory_quantity: v.inventory_quantity || 0
        }))
    }))

    return {
      products: lowStockProducts,
      count: lowStockProducts.length,
      threshold
    }
  }

  // ===== Helper Methods =====

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }
}
