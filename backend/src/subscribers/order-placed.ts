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
  
  const order = await orderModuleService.retrieveOrder(data.id, { relations: ['items', 'summary', 'shipping_address', 'cart'] })
  const shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)

  // Extract Econt office info from cart metadata if available
  let econtOfficeInfo = null
  if (order.cart_id) {
    try {
      const cart = await cartModuleService.retrieveCart(order.cart_id)
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
