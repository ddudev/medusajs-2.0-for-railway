import { ModuleProviderExports } from '@medusajs/framework/types'
import { ResendNotificationService } from './services/resend'
import { SendGridNotificationService } from './services/sendgrid'
import { SMTPNotificationService } from './services/smtp'

const services = [ResendNotificationService, SendGridNotificationService, SMTPNotificationService]

const providerExport: ModuleProviderExports = {
  services,
}

export default providerExport
