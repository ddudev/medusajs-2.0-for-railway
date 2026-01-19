import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService, ICartModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { PLACEHOLDER_TEMPLATE_ID } from '../lib/notification-templates'
import { SUPPORT_EMAIL } from '../lib/constants'

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  console.log('📦 Order placed event triggered:', data.id)
  
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const cartModuleService: ICartModuleService = container.resolve(Modules.CART)
  
  const order = await orderModuleService.retrieveOrder(data.id, { relations: ['items', 'summary', 'shipping_address'] })
  const shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)

  // Extract Econt office info from order metadata or cart metadata if available
  // Note: In MedusaJS 2.0, cart_id is not directly on OrderDTO, so we check order metadata first
  let econtOfficeInfo = null
  try {
    // First, check if Econt info is stored directly in order metadata
    const orderEcontData = (order as any).metadata?.econt as any
    if (orderEcontData?.selectedOffice) {
      econtOfficeInfo = {
        officeName: orderEcontData.selectedOffice.name || 'Econt Office',
        officeAddress: orderEcontData.selectedOffice.address?.fullAddress || orderEcontData.selectedOffice.address?.street || '',
        city: orderEcontData.selectedOffice.address?.city || orderEcontData.selectedCity?.name || ''
      }
    } else {
      // Try to get cart ID from order metadata or context
      const cartId = (order as any).metadata?.cart_id || (order as any).context?.cart_id
      
      if (cartId) {
        try {
          const cart = await cartModuleService.retrieveCart(cartId)
          const econtData = cart.metadata?.econt as any
          
          if (econtData?.selectedOffice) {
            econtOfficeInfo = {
              officeName: econtData.selectedOffice.name || 'Econt Office',
              officeAddress: econtData.selectedOffice.address?.fullAddress || econtData.selectedOffice.address?.street || '',
              city: econtData.selectedOffice.address?.city || econtData.selectedCity?.name || ''
            }
          }
        } catch (error) {
          console.warn('Could not retrieve Econt office info from cart:', error)
        }
      }
    }
  } catch (error) {
    console.warn('Error retrieving Econt office info:', error)
  }

  try {
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: PLACEHOLDER_TEMPLATE_ID, // Placeholder GUID - actual template handled in custom provider
      data: {
        template: EmailTemplates.ORDER_PLACED,
        emailOptions: {
          replyTo: SUPPORT_EMAIL,
          subject: `Order Confirmation - #${order.display_id}`
        },
        order,
        shippingAddress,
        econtOfficeInfo,
        preview: 'Thank you for your order!'
      }
    })
    
    console.log('✅ Order confirmation email queued for order:', order.display_id)
  } catch (error) {
    console.error('❌ Error sending order confirmation notification:', error)
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
