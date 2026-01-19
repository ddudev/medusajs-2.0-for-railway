import { Html, Body, Container, Preview, Tailwind, Head, Section, Img, Text, Hr, Link } from '@react-email/components'
import * as React from 'react'

interface BaseProps {
  preview?: string
  children: React.ReactNode
}

const LOGO_URL = process.env.LOGO_URL || 'https://via.placeholder.com/150x50/FF6B35/FFFFFF?text=Store+Logo'
const COMPANY_NAME = process.env.COMPANY_NAME || 'Your Store'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@yourstore.com'
const STOREFRONT_URL = process.env.STOREFRONT_URL || 'https://yourstore.com'

export const Base: React.FC<BaseProps> = ({ preview, children }) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body style={{ 
          backgroundColor: '#F9FAFB', 
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
          margin: '0',
          padding: '40px 0'
        }}>
          <Container style={{ 
            maxWidth: '600px', 
            backgroundColor: '#FFFFFF', 
            borderRadius: '12px', 
            padding: '0',
            margin: '0 auto',
            border: '1px solid #E5E7EB'
          }}>
            {/* Logo Header */}
            <Section style={{ 
              textAlign: 'center', 
              padding: '40px 40px 32px',
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}>
              <Img 
                src={LOGO_URL}
                alt={COMPANY_NAME}
                width="140"
                height="auto"
                style={{ margin: '0 auto' }}
              />
            </Section>
            
            {/* Content */}
            <Section style={{ padding: '0 40px 40px' }}>
              <div style={{ 
                maxWidth: '100%', 
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}>
                {children}
              </div>
            </Section>
            
            {/* Footer */}
            <Section style={{ 
              padding: '32px 40px',
              backgroundColor: '#F9FAFB',
              borderTop: '1px solid #E5E7EB',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px'
            }}>
              <Hr style={{ 
                borderColor: '#E5E7EB', 
                margin: '0 0 24px',
                borderWidth: '1px',
                borderStyle: 'solid'
              }} />
              
              <Text style={{ 
                color: '#9CA3AF', 
                fontSize: '14px', 
                lineHeight: '20px',
                textAlign: 'center',
                margin: '0 0 12px'
              }}>
                Need help? Contact us at{' '}
                <Link 
                  href={`mailto:${SUPPORT_EMAIL}`}
                  style={{ color: '#FF6B35', textDecoration: 'none' }}
                >
                  {SUPPORT_EMAIL}
                </Link>
              </Text>
              
              <Text style={{ 
                color: '#9CA3AF', 
                fontSize: '12px', 
                lineHeight: '18px',
                textAlign: 'center',
                margin: '0 0 12px'
              }}>
                <Link 
                  href={STOREFRONT_URL}
                  style={{ color: '#9CA3AF', textDecoration: 'underline' }}
                >
                  Visit our store
                </Link>
                {' | '}
                <Link 
                  href={`${STOREFRONT_URL}/account`}
                  style={{ color: '#9CA3AF', textDecoration: 'underline' }}
                >
                  My Account
                </Link>
              </Text>
              
              <Text style={{ 
                color: '#9CA3AF', 
                fontSize: '12px', 
                lineHeight: '18px',
                textAlign: 'center',
                margin: '0'
              }}>
                © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
