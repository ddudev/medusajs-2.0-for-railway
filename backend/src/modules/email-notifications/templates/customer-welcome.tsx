import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { t, getEmailLocale, type Locale } from '../utils/translations'

/**
 * The key for the CustomerWelcomeTemplate, used to identify it
 */
export const CUSTOMER_WELCOME = 'customer-welcome'

/**
 * The props for the CustomerWelcomeTemplate
 */
export interface CustomerWelcomeProps {
  /**
   * The customer's first name
   */
  customerName: string
  /**
   * The customer's email address
   */
  customerEmail: string
  /**
   * The storefront URL
   */
  storefrontUrl: string
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
 * Type guard for checking if the data is of type CustomerWelcomeProps
 * @param data - The data to check
 */
export const isCustomerWelcomeData = (data: any): data is CustomerWelcomeProps =>
  typeof data.customerName === 'string' &&
  typeof data.customerEmail === 'string' &&
  typeof data.storefrontUrl === 'string' &&
  (typeof data.preview === 'string' || !data.preview) &&
  (typeof data.locale === 'string' || !data.locale) &&
  (typeof data.countryCode === 'string' || !data.countryCode)

/**
 * The CustomerWelcomeTemplate component built with react-email
 */
export const CustomerWelcomeTemplate: React.FC<CustomerWelcomeProps> & {
  PreviewProps: CustomerWelcomeProps
} = ({
  customerName,
  customerEmail,
  storefrontUrl,
  locale,
  countryCode,
  preview
}) => {
  // Determine locale
  const emailLocale = locale || getEmailLocale(countryCode)
  
  // Get translations
  const translations = {
    title: t(emailLocale, 'welcome.title', { customerName }),
    greeting: t(emailLocale, 'welcome.greeting'),
    accountActive: t(emailLocale, 'welcome.accountActive', { customerEmail }),
    cta: t(emailLocale, 'welcome.cta'),
    tip: t(emailLocale, 'welcome.tip'),
    tipText: t(emailLocale, 'welcome.tipText'),
    questions: t(emailLocale, 'welcome.questions'),
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
        margin: '0 0 32px'
      }}>
        {translations.accountActive}
      </Text>
      
      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={storefrontUrl}
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
        color: '#6B7280', 
        fontSize: '14px',
        lineHeight: '20px',
        margin: '32px 0 0',
        padding: '16px',
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
        borderLeft: '4px solid #FF6B35'
      }}>
        <strong style={{ color: '#1F2937' }}>{translations.tip}</strong> {translations.tipText}
      </Text>
      
      <Text style={{ 
        color: '#9CA3AF', 
        fontSize: '14px',
        lineHeight: '20px',
        margin: '24px 0 0',
        textAlign: 'center'
      }}>
        {translations.questions}
      </Text>
    </Base>
  )
}

CustomerWelcomeTemplate.PreviewProps = {
  customerName: 'John Doe',
  customerEmail: 'john.doe@example.com',
  storefrontUrl: 'https://yourstore.com',
  locale: 'bg',
  countryCode: 'bg'
} as CustomerWelcomeProps

export default CustomerWelcomeTemplate
