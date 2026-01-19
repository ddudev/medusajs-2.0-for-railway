import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService, ICartModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { PLACEHOLDER_TEMPLATE_ID } from '../lib/notification-templates'
import { SUPPORT_EMAIL } from '../lib/constants'
import { getEmailLocale } from '../modules/email-notifications/utils/translations'
import { ECONT_SHIPPING_MODULE } from '../modules/econt-shipping'

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

  // Determine locale from shipping address country code (default to 'bg' for Bulgarian store)
  const countryCode = shippingAddress.country_code || 'bg'
  const locale = getEmailLocale(countryCode)
  console.log('🌍 Order country code:', countryCode)
  console.log('🌐 Email locale:', locale)
  
  // Debug order total fields
  console.log('💰 Order total fields:', {
    order_total: (order as any).total,
    summary_total: (order as any).summary?.total,
    summary_raw_current_order_total: (order as any).summary?.raw_current_order_total?.value,
    summary_keys: order.summary ? Object.keys(order.summary) : 'no summary'
  })

  // Extract Econt office info from order metadata or cart metadata if available
  // Note: In MedusaJS 2.0, cart_id is not directly on OrderDTO, so we check order metadata first
  let econtOfficeInfo = null
  try {
    // First, check if Econt info is stored directly in order metadata
    const orderEcontData = (order as any).metadata?.econt as any
    
    // Check if Econt office delivery is selected (shipping_to === "OFFICE")
    if (orderEcontData?.shipping_to === "OFFICE" && orderEcontData?.office_code) {
      // First, check if office details are already stored in metadata (enriched by order-placed-econt subscriber)
      if (orderEcontData.office_name || orderEcontData.office_address) {
        econtOfficeInfo = {
          officeName: orderEcontData.office_name || `Econt Office ${orderEcontData.office_code}`,
          officeAddress: orderEcontData.office_address || '',
          city: orderEcontData.city_name || ''
        }
        console.log('📦 Found Econt office from order metadata:', econtOfficeInfo)
      } else if (orderEcontData?.city_id) {
        // Office details not stored, try to look up from Econt service
        try {
          const econtService = container.resolve(ECONT_SHIPPING_MODULE) as any
          
          // Get offices for the city and find the one with matching office_code
          if (econtService?.getOffices) {
            const offices = await econtService.getOffices(orderEcontData.city_id)
            const office = offices.find((o: any) => o.office_code === orderEcontData.office_code)
            
            if (office) {
              econtOfficeInfo = {
                officeName: office.name || 'Econt Office',
                officeAddress: office.address || '',
                city: office.city_name || orderEcontData.city_name || ''
              }
              console.log('📦 Found Econt office from service:', econtOfficeInfo)
            }
          }
        } catch (lookupError) {
          console.warn('Could not look up Econt office from service:', lookupError)
        }
      }
      
      // Fallback: use office_code and city_name if available
      if (!econtOfficeInfo && orderEcontData.city_name) {
        econtOfficeInfo = {
          officeName: `Econt Office ${orderEcontData.office_code}`,
          officeAddress: '',
          city: orderEcontData.city_name
        }
        console.log('📦 Using fallback Econt office info:', econtOfficeInfo)
      }
    } else {
      // Try to get cart ID from order metadata or context to check cart metadata
      const cartId = (order as any).metadata?.cart_id || (order as any).context?.cart_id
      
      if (cartId) {
        try {
          const cart = await cartModuleService.retrieveCart(cartId)
          const econtData = cart.metadata?.econt as any
          
          // Check if Econt office delivery is selected
          if (econtData?.shipping_to === "OFFICE" && econtData?.office_code) {
            // Try to look up office details from Econt service if city_id is available
            if (econtData.city_id) {
              try {
                const econtService = container.resolve(ECONT_SHIPPING_MODULE) as any
                
                if (econtService?.getOffices) {
                  const offices = await econtService.getOffices(econtData.city_id)
                  const office = offices.find((o: any) => o.office_code === econtData.office_code)
                  
                  if (office) {
                    econtOfficeInfo = {
                      officeName: office.name || 'Econt Office',
                      officeAddress: office.address || '',
                      city: office.city_name || econtData.city_name || ''
                    }
                    console.log('📦 Found Econt office from cart/service:', econtOfficeInfo)
                  }
                }
              } catch (lookupError) {
                console.warn('Could not look up Econt office from service:', lookupError)
              }
            }
            
            // Fallback: use office_code and city_name if available
            if (!econtOfficeInfo && econtData.city_name) {
              econtOfficeInfo = {
                officeName: `Econt Office ${econtData.office_code}`,
                officeAddress: '',
                city: econtData.city_name
              }
              console.log('📦 Using fallback Econt office info from cart:', econtOfficeInfo)
            }
          }
        } catch (error) {
          console.warn('Could not retrieve Econt office info from cart:', error)
        }
      }
    }
    
    if (!econtOfficeInfo) {
      console.log('📦 No Econt office info found (might be home delivery)')
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
          subject: locale === 'bg' 
            ? `Потвърждение на поръчка - #${order.display_id}`
            : `Order Confirmation - #${order.display_id}`
        },
        order,
        shippingAddress,
        econtOfficeInfo,
        locale,
        countryCode,
        preview: locale === 'bg' ? 'Благодарим ви за поръчката!' : 'Thank you for your order!'
      }
    })
    
    console.log('✅ Order confirmation email queued for order:', order.display_id)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    
    // Check for SendGrid-specific errors
    if (errorMessage.includes('Maximum credits exceeded') || errorMessage.includes('credits')) {
      console.warn('⚠️  SendGrid credit limit exceeded. Order confirmation email not sent.')
      console.warn('💡 To fix: Upgrade your SendGrid plan or wait for credit reset.')
      console.warn('📦 Order:', order.display_id, '| Email:', order.email)
    } else if (errorMessage.includes('SendGrid')) {
      console.error('❌ SendGrid error sending order confirmation:', errorMessage)
      console.error('📦 Order:', order.display_id, '| Email:', order.email)
    } else {
      console.error('❌ Error sending order confirmation notification:', errorMessage)
      console.error('📦 Order:', order.display_id, '| Email:', order.email)
    }
    
    // Only log full error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    }
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
