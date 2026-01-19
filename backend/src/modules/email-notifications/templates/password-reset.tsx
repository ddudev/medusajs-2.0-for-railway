import { Button, Heading, Hr, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { t, getEmailLocale, type Locale } from '../utils/translations'

/**
 * The key for the PasswordResetTemplate, used to identify it
 */
export const PASSWORD_RESET = 'password-reset'

/**
 * The props for the PasswordResetTemplate
 */
export interface PasswordResetProps {
  /**
   * The customer's first name
   */
  customerName: string
  /**
   * The password reset link with token
   */
  resetLink: string
  /**
   * Number of hours until the link expires
   */
  expirationHours?: number
  /**
   * Locale for translations ('en' or 'bg')
   */
  locale?: Locale
  /**
   * Country code to determine locale (if locale not provided)
   */
  countryCode?: string
  /**
   * The preview text for the email, appears next to the subject
   * in mail providers like Gmail
   */
  preview?: string
}

/**
 * Type guard for checking if the data is of type PasswordResetProps
 * @param data - The data to check
 */
export const isPasswordResetData = (data: any): data is PasswordResetProps =>
  typeof data.customerName === 'string' &&
  typeof data.resetLink === 'string' &&
  (typeof data.expirationHours === 'number' || !data.expirationHours) &&
  (typeof data.preview === 'string' || !data.preview) &&
  (typeof data.locale === 'string' || !data.locale) &&
  (typeof data.countryCode === 'string' || !data.countryCode)

/**
 * The PasswordResetTemplate component built with react-email
 */
export const PasswordResetTemplate: React.FC<PasswordResetProps> & {
  PreviewProps: PasswordResetProps
} = ({
  customerName,
  resetLink,
  expirationHours = 24,
  locale,
  countryCode,
  preview
}) => {
  // Determine locale
  const emailLocale = locale || getEmailLocale(countryCode)
  
  // Get translations
  const translations = {
    title: t(emailLocale, 'passwordReset.title'),
    greeting: t(emailLocale, 'passwordReset.greeting', { customerName }),
    message: t(emailLocale, 'passwordReset.message'),
    cta: t(emailLocale, 'passwordReset.cta'),
    alternativeLink: t(emailLocale, 'passwordReset.alternativeLink'),
    securityNotice: t(emailLocale, 'passwordReset.securityNotice'),
    expiration: t(emailLocale, 'passwordReset.expiration', { expirationHours: String(expirationHours) }),
    ignore: t(emailLocale, 'passwordReset.ignore'),
    trouble: t(emailLocale, 'passwordReset.trouble'),
  }
  
  const previewText = preview || translations.title

  return (
    <Base preview={previewText} locale={emailLocale} countryCode={countryCode}>
      <Heading style={{ 
        color: '#1F2937', 
        fontSize: '28px', 
        fontWeight: 'bold', 
        textAlign: 'center',
        margin: '0 0 24px',
        lineHeight: '1.3'
      }}>
        {translations.title}
      </Heading>
      
      <Text style={{ 
        color: '#4B5563', 
        fontSize: '16px',
        lineHeight: '24px',
        margin: '0 0 16px'
      }}>
        {translations.greeting}
      </Text>
      
      <Text style={{ 
        color: '#4B5563', 
        fontSize: '16px',
        lineHeight: '24px',
        margin: '0 0 24px'
      }}>
        {translations.message}
      </Text>
      
      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={resetLink}
          style={{
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            padding: '14px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '16px',
            textDecoration: 'none',
            display: 'inline-block',
            border: 'none'
          }}
        >
          {translations.cta}
        </Button>
      </Section>
      
      <Text style={{ 
        color: '#9CA3AF', 
        fontSize: '14px',
        lineHeight: '20px',
        margin: '24px 0',
        textAlign: 'center',
        wordBreak: 'break-all'
      }}>
        {translations.alternativeLink}{' '}
        <Link
          href={resetLink}
          style={{ color: '#FF6B35', textDecoration: 'underline' }}
        >
          {resetLink}
        </Link>
      </Text>
      
      <Hr style={{ 
        borderColor: '#E5E7EB', 
        margin: '32px 0',
        borderWidth: '1px',
        borderStyle: 'solid'
      }} />
      
      <Text style={{ 
        color: '#DC2626', 
        fontSize: '14px',
        lineHeight: '20px',
        margin: '0 0 16px',
        padding: '16px',
        backgroundColor: '#FEF2F2',
        borderRadius: '8px',
        borderLeft: '4px solid #DC2626'
      }}>
        <strong>{translations.securityNotice}</strong> {translations.expiration}
      </Text>
      
      <Text style={{ 
        color: '#6B7280', 
        fontSize: '14px',
        lineHeight: '20px',
        margin: '16px 0 0'
      }}>
        {translations.ignore}
      </Text>
      
      <Text style={{ 
        color: '#9CA3AF', 
        fontSize: '14px',
        lineHeight: '20px',
        margin: '24px 0 0',
        textAlign: 'center'
      }}>
        {translations.trouble}
      </Text>
    </Base>
  )
}

PasswordResetTemplate.PreviewProps = {
  customerName: 'John Doe',
  resetLink: 'https://yourstore.com/account/reset-password?token=abc123xyz789longtokenstring',
  expirationHours: 24,
  locale: 'bg',
  countryCode: 'bg'
} as PasswordResetProps

export default PasswordResetTemplate
