import { Logger, NotificationTypes } from '@medusajs/framework/types'
import { AbstractNotificationProviderService, MedusaError } from '@medusajs/framework/utils'
import { ReactNode } from 'react'
import { render } from '@react-email/render'
import nodemailer from 'nodemailer'
import { generateEmailTemplate } from '../templates'

type InjectedDependencies = {
  logger: Logger
}

interface SMTPServiceConfig {
  host: string
  port: number
  secure: boolean // true for 465, false for other ports
  auth: {
    user: string
    pass: string
  }
  from: string
  fromName?: string
}

export interface SMTPNotificationServiceOptions {
  host: string
  port: number
  secure?: boolean // true for 465, false for other ports
  user: string
  password: string
  from: string
  fromName?: string
}

type NotificationEmailOptions = {
  replyTo?: string
  subject?: string
  headers?: Record<string, string>
  cc?: string[]
  bcc?: string[]
  tags?: string[]
  text?: string
}

/**
 * Service to handle email notifications using SMTP (direct email sending).
 * Renders React email templates to HTML and sends via SMTP.
 * 
 * Supports:
 * - Gmail SMTP (smtp.gmail.com)
 * - Outlook/Hotmail SMTP (smtp-mail.outlook.com)
 * - Custom SMTP servers
 * - Any SMTP provider (Mailgun, Mailtrap, etc.)
 */
export class SMTPNotificationService extends AbstractNotificationProviderService {
  static identifier = "smtp"
  protected config_: SMTPServiceConfig
  protected logger_: Logger
  protected transporter_: nodemailer.Transporter

  constructor({ logger }: InjectedDependencies, options: SMTPNotificationServiceOptions) {
    super()
    
    this.config_ = {
      host: options.host,
      port: options.port,
      secure: options.secure ?? (options.port === 465), // Default: secure for port 465
      auth: {
        user: options.user,
        pass: options.password,
      },
      from: options.from,
      fromName: options.fromName,
    }
    
    this.logger_ = logger

    // Create nodemailer transporter
    this.transporter_ = nodemailer.createTransport({
      host: this.config_.host,
      port: this.config_.port,
      secure: this.config_.secure,
      auth: this.config_.auth,
      // Additional options for better compatibility
      tls: {
        // Do not fail on invalid certs (useful for self-signed certs)
        rejectUnauthorized: false,
      },
    })

    // Verify connection on startup (optional, but recommended)
    this.transporter_.verify().then(() => {
      this.logger_.log(`✅ SMTP connection verified for ${this.config_.host}:${this.config_.port}`)
    }).catch((error) => {
      this.logger_.warn(`⚠️  SMTP connection verification failed: ${error.message}`)
      this.logger_.warn('Emails may still work, but connection was not verified')
    })
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `No notification information provided`)
    }
    if (notification.channel === 'sms') {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `SMS notification not supported`)
    }

    // Generate the email content using the template
    let emailContent: ReactNode
    const templateKey = (notification.data?.template as string) || notification.template

    try {
      emailContent = generateEmailTemplate(templateKey, notification.data)
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error
      }
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate email content for template: ${templateKey}`
      )
    }

    // Render React component to HTML
    const html = await render(emailContent)
    
    // Generate plain text version (optional, but recommended)
    const text = await render(emailContent, { plainText: true })

    const emailOptions = notification.data?.emailOptions as NotificationEmailOptions

    // Format "from" address with optional name
    const fromAddress = this.config_.fromName
      ? `${this.config_.fromName} <${this.config_.from}>`
      : this.config_.from

    // Compose the message for SMTP
    const mailOptions = {
      from: notification.from?.trim() ?? fromAddress,
      to: notification.to,
      subject: emailOptions?.subject ?? 'You have a new notification',
      html,
      text: emailOptions?.text ?? text,
      replyTo: emailOptions?.replyTo,
      headers: emailOptions?.headers,
      cc: emailOptions?.cc,
      bcc: emailOptions?.bcc,
      // Attachments support
      attachments: Array.isArray(notification.attachments)
        ? notification.attachments.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.content_type,
            contentDisposition: (attachment.disposition === 'inline' ? 'inline' : 'attachment') as 'inline' | 'attachment',
            cid: attachment.id ?? undefined,
          }))
        : undefined,
    }

    // Send the email via SMTP
    try {
      const info = await this.transporter_.sendMail(mailOptions)
      const messageId = (info as any)?.messageId || 'unknown'
      this.logger_.log(
        `✅ Successfully sent "${templateKey}" email to ${notification.to} via SMTP (Message ID: ${messageId})`
      )
      return {}
    } catch (error: any) {
      const errorMessage = error.message ?? 'unknown error'
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send "${templateKey}" email to ${notification.to} via SMTP: ${errorMessage}`
      )
    }
  }
}
