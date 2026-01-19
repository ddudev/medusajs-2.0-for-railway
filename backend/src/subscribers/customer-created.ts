import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, ICustomerModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { PLACEHOLDER_TEMPLATE_ID } from '../lib/notification-templates'
import { STOREFRONT_URL, SUPPORT_EMAIL } from '../lib/constants'

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  console.log('🎉 Customer created event triggered:', data.id)
  console.log('📋 Event data keys:', Object.keys(data))
  
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)
  
  try {
    // Retrieve full customer data from customer module
    const customer = await customerModuleService.retrieveCustomer(data.id)
    
    console.log('📧 Customer email:', customer.email)
    console.log('👤 Customer name:', customer.first_name)
    
    if (!customer.email) {
      console.error('❌ Cannot send welcome email: customer.email is undefined')
      console.log('Full customer object:', JSON.stringify(customer, null, 2))
      return
    }
    
    await notificationModuleService.createNotifications({
      to: customer.email,
      channel: 'email',
      template: PLACEHOLDER_TEMPLATE_ID, // Placeholder GUID - actual template handled in custom provider
      data: {
        template: EmailTemplates.CUSTOMER_WELCOME,
        emailOptions: {
          replyTo: SUPPORT_EMAIL,
          subject: 'Welcome to Our Store!'
        },
        customerName: customer.first_name || 'Valued Customer',
        customerEmail: customer.email,
        storefrontUrl: STOREFRONT_URL,
        preview: 'Welcome! Your account has been created.'
      }
    })
    
    console.log('✅ Welcome email queued for customer:', customer.email)
  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
  }
}

export const config: SubscriberConfig = {
  event: 'customer.created'
}
