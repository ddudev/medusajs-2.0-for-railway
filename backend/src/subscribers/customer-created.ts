import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, ICustomerModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { PLACEHOLDER_TEMPLATE_ID } from '../lib/notification-templates'
import { STOREFRONT_URL, SUPPORT_EMAIL } from '../lib/constants'
import { getEmailLocale } from '../modules/email-notifications/utils/translations'

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  console.log('🎉 Customer created event triggered:', data.id)
  console.log('📋 Event data keys:', Object.keys(data))
  
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)
  
  let customer: any = null
  
  try {
    // Retrieve full customer data from customer module
    customer = await customerModuleService.retrieveCustomer(data.id)
    
    console.log('📧 Customer email:', customer.email)
    console.log('👤 Customer name:', customer.first_name)
    
    if (!customer.email) {
      console.error('❌ Cannot send welcome email: customer.email is undefined')
      console.log('Full customer object:', JSON.stringify(customer, null, 2))
      return
    }
    
    // Get country code from customer's shipping address or default to 'bg'
    const countryCode = (customer as any).shipping_addresses?.[0]?.country_code || 'bg'
    const locale = getEmailLocale(countryCode)
    console.log('🌍 Customer country code:', countryCode)
    console.log('🌐 Email locale:', locale)
    
    await notificationModuleService.createNotifications({
      to: customer.email,
      channel: 'email',
      template: PLACEHOLDER_TEMPLATE_ID, // Placeholder GUID - actual template handled in custom provider
      data: {
        template: EmailTemplates.CUSTOMER_WELCOME,
        emailOptions: {
          replyTo: SUPPORT_EMAIL,
          subject: locale === 'bg' ? 'Добре дошли в нашия магазин!' : 'Welcome to Our Store!'
        },
        customerName: customer.first_name || 'Valued Customer',
        customerEmail: customer.email,
        storefrontUrl: STOREFRONT_URL,
        locale,
        countryCode,
        preview: locale === 'bg' ? 'Добре дошли! Вашият акаунт е създаден.' : 'Welcome! Your account has been created.'
      }
    })
    
    console.log('✅ Welcome email queued for customer:', customer.email)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    const customerEmail = customer?.email || 'unknown'
    
    // Check for SendGrid-specific errors
    if (errorMessage.includes('Maximum credits exceeded') || errorMessage.includes('credits')) {
      console.warn('⚠️  SendGrid credit limit exceeded. Welcome email not sent.')
      console.warn('💡 To fix: Upgrade your SendGrid plan or wait for credit reset.')
      console.warn('📧 Customer registration succeeded, but welcome email was skipped:', customerEmail)
    } else if (errorMessage.includes('SendGrid')) {
      console.error('❌ SendGrid error sending welcome email:', errorMessage)
      console.error('📧 Customer:', customerEmail)
    } else {
      console.error('❌ Error sending welcome email:', errorMessage)
      console.error('📧 Customer:', customerEmail)
    }
    
    // Only log full error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    }
  }
}

export const config: SubscriberConfig = {
  event: 'customer.created'
}
