import { Modules } from "@medusajs/framework/utils"
import { IOrderModuleService, ICartModuleService } from "@medusajs/framework/types"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { ECONT_SHIPPING_MODULE } from "../modules/econt-shipping"

/**
 * Subscriber that saves Econt shipping data from cart metadata to order metadata
 * when an order is placed
 */
export default async function orderPlacedEcontHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const cartModuleService: ICartModuleService = container.resolve(Modules.CART)

  try {
    const order = await orderModuleService.retrieveOrder(data.id, {
      relations: ["items", "summary"],
    })

    // Get cart ID from order (if available in order metadata or relations)
    // In MedusaJS, we might need to store cart_id in order metadata during order creation
    // For now, we'll check if Econt data is already in order metadata from cart
    // If not, we'll try to get it from the cart that created this order

    // Check if order already has Econt data in metadata
    if (order.metadata?.econt) {
      // Already saved, skip
      return
    }

    // Try to get cart from order context or metadata
    const cartId = order.metadata?.cart_id as string | undefined

    if (cartId) {
      const cart = await cartModuleService.retrieveCart(cartId)

      if (cart.metadata?.econt) {
        const econtData = cart.metadata.econt as any
        
        // If office delivery is selected, try to enrich with office details
        if (econtData?.shipping_to === "OFFICE" && econtData?.office_code && econtData?.city_id) {
          try {
            const econtService = container.resolve(ECONT_SHIPPING_MODULE) as any
            
            // Get office details from service to store in order metadata
            if (econtService?.getOffices) {
              const offices = await econtService.getOffices(econtData.city_id)
              const office = offices.find((o: any) => o.office_code === econtData.office_code)
              
              if (office) {
                // Enrich Econt data with office details for email template
                econtData.office_name = office.name
                econtData.office_address = office.address
                // city_name should already be in econtData, but ensure it's set
                if (!econtData.city_name && office.city_name) {
                  econtData.city_name = office.city_name
                }
              }
            }
          } catch (lookupError) {
            // Don't fail order placement if office lookup fails
            const logger = container.resolve("logger")
            logger.warn(`Could not enrich Econt office details: ${lookupError instanceof Error ? lookupError.message : String(lookupError)}`)
          }
        }
        
        // Save Econt data to order metadata (with enriched office details if available)
        await orderModuleService.updateOrders(data.id, {
          metadata: {
            ...order.metadata,
            econt: econtData,
          },
        })
      }
    }
  } catch (error) {
    container.resolve("logger").error("Error saving Econt data to order:", error)
    // Don't throw - order placement should not fail if Econt data save fails
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

