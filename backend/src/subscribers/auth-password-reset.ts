import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, ICustomerModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { PLACEHOLDER_TEMPLATE_ID } from '../lib/notification-templates'
import { STOREFRONT_URL, SUPPORT_EMAIL } from '../lib/constants'
import { getEmailLocale } from '../modules/email-notifications/utils/translations'

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  console.log('🔐 Password reset token created event triggered')
  console.log('📋 Event data keys:', Object.keys(data))
  console.log('📋 Event data:', JSON.stringify(data, null, 2))
  
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)
  
  // Extract email and token from the event data
  // In MedusaJS 2.0, the email might be in different places:
  // - data.identifier (the email used for reset)
  // - data.entity_id (for emailpass provider, entity_id is the email)
  // - data.email (direct email field)
  // - data.actor_id (customer ID, need to retrieve customer)
  const email = data.email || data.identifier || data.entity_id
  const token = data.token || data.reset_token
  const actorId = data.actor_id || data.actorId
  
  console.log('📧 Extracted email:', email)
  console.log('🎫 Extracted token:', token ? 'present' : 'missing')
  console.log('👤 Actor ID:', actorId)
  
  if (!email) {
    console.error('❌ Cannot send password reset email: email is undefined')
    console.log('Full event data:', JSON.stringify(data, null, 2))
    return
  }
  
  if (!token) {
    console.error('❌ Cannot send password reset email: token is undefined')
    return
  }
  
  try {
    // Retrieve customer to get their name and country code for locale
    let customerName = 'Valued Customer'
    let countryCode: string | null = null
    
    if (actorId) {
      try {
        const customer = await customerModuleService.retrieveCustomer(actorId)
        customerName = customer.first_name || 'Valued Customer'
        // Get country code from customer's shipping address or default to 'bg'
        countryCode = (customer as any).shipping_addresses?.[0]?.country_code || 'bg'
        console.log('👤 Customer name:', customerName)
        console.log('🌍 Customer country code:', countryCode)
      } catch (err) {
        console.warn('Could not retrieve customer for password reset:', err)
        // Try to find customer by email as fallback
        try {
          const customers = await customerModuleService.listCustomers({ email })
          if (customers && customers.length > 0) {
            customerName = customers[0].first_name || 'Valued Customer'
            countryCode = (customers[0] as any).shipping_addresses?.[0]?.country_code || 'bg'
            console.log('👤 Customer name (from email lookup):', customerName)
            console.log('🌍 Customer country code (from email lookup):', countryCode)
          }
        } catch (emailErr) {
          console.warn('Could not find customer by email:', emailErr)
        }
      }
    } else {
      // Try to find customer by email if no actor_id
      try {
        const customers = await customerModuleService.listCustomers({ email })
        if (customers && customers.length > 0) {
          customerName = customers[0].first_name || 'Valued Customer'
          countryCode = (customers[0] as any).shipping_addresses?.[0]?.country_code || 'bg'
          console.log('👤 Customer name (from email lookup):', customerName)
          console.log('🌍 Customer country code (from email lookup):', countryCode)
        }
      } catch (emailErr) {
        console.warn('Could not find customer by email:', emailErr)
      }
    }
    
    // Determine locale from country code (default to 'bg' for Bulgarian store)
    const locale = getEmailLocale(countryCode || 'bg')
    console.log('🌐 Email locale:', locale)
    
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
          subject: locale === 'bg' ? 'Възстановяване на парола' : 'Reset Your Password'
        },
        customerName,
        resetLink,
        expirationHours: 24,
        locale,
        countryCode: countryCode || 'bg',
        preview: locale === 'bg' ? 'Възстановяване на парола' : 'Reset your password'
      }
    })
    
    console.log('✅ Password reset email queued for:', email)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    
    // Check for SendGrid-specific errors
    if (errorMessage.includes('Maximum credits exceeded') || errorMessage.includes('credits')) {
      console.warn('⚠️  SendGrid credit limit exceeded. Password reset email not sent.')
      console.warn('💡 To fix: Upgrade your SendGrid plan or wait for credit reset.')
      console.warn('📧 Password reset requested but email was skipped:', email)
    } else if (errorMessage.includes('SendGrid')) {
      console.error('❌ SendGrid error sending password reset email:', errorMessage)
      console.error('📧 Email:', email)
    } else {
      console.error('❌ Error sending password reset email:', errorMessage)
      console.error('📧 Email:', email)
    }
    
    // Only log full error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    }
  }
}

export const config: SubscriberConfig = {
  // MedusaJS 2.0 auth events - may need to be adjusted based on actual implementation
  // Common event names: 'auth.password_reset', 'customer.password_reset', 'auth_identity.password_reset_requested'
  event: ['auth.password_reset', 'customer.password_reset', 'auth_identity.password_reset']
}
