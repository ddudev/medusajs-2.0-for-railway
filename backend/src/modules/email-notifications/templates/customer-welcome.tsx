import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

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
  (typeof data.preview === 'string' || !data.preview)

/**
 * The CustomerWelcomeTemplate component built with react-email
 */
export const CustomerWelcomeTemplate: React.FC<CustomerWelcomeProps> & {
  PreviewProps: CustomerWelcomeProps
} = ({
  customerName,
  customerEmail,
  storefrontUrl,
  preview = 'Welcome to Our Store!'
}) => {
  return (
    <Base preview={preview}>
      <Heading style={{ 
        color: '#1F2937', 
        fontSize: '28px', 
        fontWeight: 'bold', 
        textAlign: 'center',
        margin: '0 0 24px',
        lineHeight: '1.3'
      }}>
        Welcome, {customerName}!
      </Heading>
      
      <Text style={{ 
        color: '#4B5563', 
        fontSize: '16px', 
        lineHeight: '24px',
        margin: '0 0 16px'
      }}>
        Thank you for creating an account with us. We're excited to have you as part of our community!
      </Text>
      
      <Text style={{ 
        color: '#4B5563', 
        fontSize: '16px', 
        lineHeight: '24px',
        margin: '0 0 32px'
      }}>
        Your account (<strong>{customerEmail}</strong>) is now active and ready to use. You can now enjoy a faster checkout experience, track your orders, and manage your account preferences.
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
          Start Shopping
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
        <strong style={{ color: '#1F2937' }}>Tip:</strong> Save this email for your records. If you ever need to reset your password or have questions about your account, you can always reach out to our support team.
      </Text>
      
      <Text style={{ 
        color: '#9CA3AF', 
        fontSize: '14px',
        lineHeight: '20px',
        margin: '24px 0 0',
        textAlign: 'center'
      }}>
        If you have any questions, feel free to reply to this email or contact our support team.
      </Text>
    </Base>
  )
}

CustomerWelcomeTemplate.PreviewProps = {
  customerName: 'John Doe',
  customerEmail: 'john.doe@example.com',
  storefrontUrl: 'https://yourstore.com'
} as CustomerWelcomeProps

export default CustomerWelcomeTemplate
