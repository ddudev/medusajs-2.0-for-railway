import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, ICustomerModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { PLACEHOLDER_TEMPLATE_ID } from '../lib/notification-templates'
import { STOREFRONT_URL, SUPPORT_EMAIL } from '../lib/constants'

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  console.log('🔐 Password reset token created event triggered:', data)
  
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)
  
  // Extract email and token from the event data
  // The structure may vary depending on MedusaJS 2.0 auth implementation
  const { email, token, actor_id } = data
  
  try {
    // Retrieve customer to get their name
    let customerName = 'Valued Customer'
    if (actor_id) {
      try {
        const customer = await customerModuleService.retrieveCustomer(actor_id)
        customerName = customer.first_name || 'Valued Customer'
      } catch (err) {
        console.warn('Could not retrieve customer for password reset:', err)
      }
    }
    
    // Build the reset link
    const resetLink = `${STOREFRONT_URL}/account/reset-password?token=${token}`
    
    await notificationModuleService.createNotifications({
      to: email,
      channel: 'email',
      template: PLACEHOLDER_TEMPLATE_ID, // Placeholder GUID - actual template handled in custom provider
      data: {
        template: EmailTemplates.PASSWORD_RESET,
        emailOptions: {
          replyTo: SUPPORT_EMAIL,
          subject: 'Reset Your Password'
        },
        customerName,
        resetLink,
        expirationHours: 24,
        preview: 'Reset your password'
      }
    })
    
    console.log('✅ Password reset email queued for:', email)
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
  }
}

export const config: SubscriberConfig = {
  // MedusaJS 2.0 auth events - may need to be adjusted based on actual implementation
  // Common event names: 'auth.password_reset', 'customer.password_reset', 'auth_identity.password_reset_requested'
  event: ['auth.password_reset', 'customer.password_reset', 'auth_identity.password_reset']
}
