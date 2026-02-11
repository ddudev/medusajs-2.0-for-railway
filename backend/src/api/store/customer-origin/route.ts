import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICartModuleService, ICustomerModuleService } from "@medusajs/framework/types"

const ORIGIN_KEYS = [
  "origin_type",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "referrer",
] as const

function pickOrigin(body: Record<string, unknown>): Record<string, unknown> {
  const origin: Record<string, unknown> = {}
  for (const key of ORIGIN_KEYS) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      origin[key] = body[key]
    }
  }
  return origin
}

/**
 * POST /store/customer-origin
 * Attach first-touch origin to cart metadata and/or customer metadata.
 * Body: customer_id?, cart_id?, utm_source?, utm_medium?, utm_campaign?, gclid?, fbclid?, referrer?, origin_type?
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const origin = pickOrigin(body)
    if (Object.keys(origin).length === 0) {
      res.status(400).json({ message: "At least one origin field is required" })
      return
    }

    const cartId = body.cart_id as string | undefined
    const customerId = body.customer_id as string | undefined

    if (cartId) {
      const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART)
      const cart = await cartModuleService.retrieveCart(cartId)
      await cartModuleService.updateCarts(cartId, {
        metadata: {
          ...(cart.metadata as Record<string, unknown>),
          ...origin,
        },
      })
    }

    if (customerId) {
      const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
      const customer = await customerModuleService.retrieveCustomer(customerId)
      const existing = (customer.metadata as Record<string, unknown>)?.origin_type
      if (existing === undefined || existing === null || existing === "") {
        await customerModuleService.updateCustomers(customerId, {
          metadata: {
            ...(customer.metadata as Record<string, unknown>),
            ...origin,
          },
        })
      }
    }

    res.json({ ok: true })
  } catch (e) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error("[Store] Customer origin error", e)
    res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to save customer origin",
    })
  }
}
