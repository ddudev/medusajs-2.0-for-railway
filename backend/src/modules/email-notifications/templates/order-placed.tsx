import { Text, Section, Hr, Heading, Img, Column, Row } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { OrderDTO, OrderAddressDTO } from '@medusajs/framework/types'

export const ORDER_PLACED = 'order-placed'

interface OrderPlacedPreviewProps {
  order: OrderDTO & { 
    display_id: string
    summary: { 
      raw_current_order_total: { value: number }
    }
  }
  shippingAddress: OrderAddressDTO
  econtOfficeInfo?: {
    officeName: string
    officeAddress: string
    city: string
  }
}

export interface OrderPlacedTemplateProps {
  order: OrderDTO & { 
    display_id: string
    summary: { 
      raw_current_order_total: { value: number }
    }
  }
  shippingAddress: OrderAddressDTO
  econtOfficeInfo?: {
    officeName: string
    officeAddress: string
    city: string
  }
  preview?: string
}

export const isOrderPlacedTemplateData = (data: any): data is OrderPlacedTemplateProps =>
  typeof data.order === 'object' && typeof data.shippingAddress === 'object'

// Helper function to format currency
const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = currencyCode.toUpperCase()
  
  // Convert from cents to main unit
  const mainAmount = amount / 100
  
  // Format with 2 decimal places
  const formatted = mainAmount.toFixed(2)
  
  // Add currency symbol or code
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'BGN': 'лв',
    'LEV': 'лв'
  }
  
  const symbol = symbols[currency] || currency
  
  // For BGN/LEV, put symbol after amount
  if (currency === 'BGN' || currency === 'LEV') {
    return `${formatted} ${symbol}`
  }
  
  return `${symbol}${formatted}`
}

export const OrderPlacedTemplate: React.FC<OrderPlacedTemplateProps> & {
  PreviewProps: OrderPlacedPreviewProps
} = ({ order, shippingAddress, econtOfficeInfo, preview = 'Your order has been placed!' }) => {
  return (
    <Base preview={preview}>
      <Section>
        {/* Success Banner */}
        <Section style={{
          backgroundColor: '#ECFDF5',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '32px',
          borderLeft: '4px solid #2D8659'
        }}>
          <Heading style={{ 
            color: '#2D8659', 
            fontSize: '24px', 
            fontWeight: 'bold', 
            textAlign: 'center',
            margin: '0 0 8px'
          }}>
            ✓ Order Confirmed!
          </Heading>
          <Text style={{ 
            color: '#065F46', 
            textAlign: 'center',
            margin: '0',
            fontSize: '14px'
          }}>
            Thank you for your order. We'll send you a shipping confirmation email as soon as your order ships.
          </Text>
        </Section>

        <Text style={{ 
          color: '#4B5563',
          fontSize: '16px',
          margin: '0 0 24px'
        }}>
          Hi {shippingAddress.first_name} {shippingAddress.last_name},
        </Text>

        {/* Order Summary Card */}
        <Section style={{
          backgroundColor: '#F9FAFB',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <Heading style={{ 
            color: '#1F2937',
            fontSize: '18px', 
            fontWeight: 'bold', 
            margin: '0 0 16px'
          }}>
            Order Summary
          </Heading>
          
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', color: '#6B7280', fontSize: '14px' }}>Order Number:</td>
                <td style={{ padding: '8px 0', color: '#1F2937', fontSize: '14px', fontWeight: '600', textAlign: 'right' }}>
                  #{order.display_id}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#6B7280', fontSize: '14px' }}>Order Date:</td>
                <td style={{ padding: '8px 0', color: '#1F2937', fontSize: '14px', textAlign: 'right' }}>
                  {new Date(order.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#6B7280', fontSize: '14px' }}>Order Total:</td>
                <td style={{ padding: '8px 0', color: '#FF6B35', fontSize: '18px', fontWeight: 'bold', textAlign: 'right' }}>
                  {formatCurrency(order.summary.raw_current_order_total.value, order.currency_code)}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Hr style={{ 
          borderColor: '#E5E7EB', 
          margin: '32px 0',
          borderWidth: '1px'
        }} />

        {/* Order Items */}
        <Heading style={{ 
          color: '#1F2937',
          fontSize: '18px', 
          fontWeight: 'bold', 
          margin: '0 0 16px'
        }}>
          Order Items
        </Heading>

        {order.items.map((item) => (
          <Section key={item.id} style={{
            borderBottom: '1px solid #E5E7EB',
            padding: '16px 0'
          }}>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '70%', verticalAlign: 'top' }}>
                    <Text style={{ 
                      color: '#1F2937',
                      fontSize: '15px',
                      fontWeight: '600',
                      margin: '0 0 4px'
                    }}>
                      {item.product_title}
                    </Text>
                    <Text style={{ 
                      color: '#6B7280',
                      fontSize: '14px',
                      margin: '0'
                    }}>
                      {item.title}
                    </Text>
                  </td>
                  <td style={{ width: '15%', textAlign: 'center', verticalAlign: 'top' }}>
                    <Text style={{ 
                      color: '#6B7280',
                      fontSize: '14px',
                      margin: '0'
                    }}>
                      Qty: {item.quantity}
                    </Text>
                  </td>
                  <td style={{ width: '15%', textAlign: 'right', verticalAlign: 'top' }}>
                    <Text style={{ 
                      color: '#1F2937',
                      fontSize: '15px',
                      fontWeight: '600',
                      margin: '0'
                    }}>
                      {formatCurrency(item.unit_price, order.currency_code)}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
        ))}

        <Hr style={{ 
          borderColor: '#E5E7EB', 
          margin: '32px 0',
          borderWidth: '1px'
        }} />

        {/* Shipping Information */}
        <Heading style={{ 
          color: '#1F2937',
          fontSize: '18px', 
          fontWeight: 'bold', 
          margin: '0 0 16px'
        }}>
          Shipping Information
        </Heading>

        {econtOfficeInfo ? (
          // Econt Office Delivery
          <Section style={{
            backgroundColor: '#FFF7ED',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            borderLeft: '4px solid #FF6B35'
          }}>
            <Text style={{ 
              color: '#1F2937',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 8px'
            }}>
              📦 Pickup from Econt Office
            </Text>
            <Text style={{ 
              color: '#92400E',
              fontSize: '14px',
              margin: '0 0 4px'
            }}>
              <strong>Office:</strong> {econtOfficeInfo.officeName}
            </Text>
            <Text style={{ 
              color: '#92400E',
              fontSize: '14px',
              margin: '0 0 4px'
            }}>
              <strong>Address:</strong> {econtOfficeInfo.officeAddress}
            </Text>
            <Text style={{ 
              color: '#92400E',
              fontSize: '14px',
              margin: '0'
            }}>
              <strong>City:</strong> {econtOfficeInfo.city}
            </Text>
          </Section>
        ) : (
          // Home Delivery
          <Section style={{
            backgroundColor: '#F9FAFB',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <Text style={{ 
              color: '#1F2937',
              fontSize: '14px',
              margin: '0 0 8px',
              fontWeight: '600'
            }}>
              Delivery Address:
            </Text>
            <Text style={{ 
              color: '#4B5563',
              fontSize: '14px',
              margin: '0 0 4px'
            }}>
              {shippingAddress.first_name} {shippingAddress.last_name}
            </Text>
            <Text style={{ 
              color: '#4B5563',
              fontSize: '14px',
              margin: '0 0 4px'
            }}>
              {shippingAddress.address_1}
            </Text>
            {shippingAddress.address_2 && (
              <Text style={{ 
                color: '#4B5563',
                fontSize: '14px',
                margin: '0 0 4px'
              }}>
                {shippingAddress.address_2}
              </Text>
            )}
            <Text style={{ 
              color: '#4B5563',
              fontSize: '14px',
              margin: '0 0 4px'
            }}>
              {shippingAddress.city}, {shippingAddress.province} {shippingAddress.postal_code}
            </Text>
            <Text style={{ 
              color: '#4B5563',
              fontSize: '14px',
              margin: '0'
            }}>
              {shippingAddress.country_code}
            </Text>
            {shippingAddress.phone && (
              <Text style={{ 
                color: '#4B5563',
                fontSize: '14px',
                margin: '8px 0 0'
              }}>
                Phone: {shippingAddress.phone}
              </Text>
            )}
          </Section>
        )}

        {/* Help Section */}
        <Section style={{
          backgroundColor: '#EFF6FF',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '32px',
          borderLeft: '4px solid #3B82F6'
        }}>
          <Text style={{ 
            color: '#1E40AF',
            fontSize: '14px',
            fontWeight: '600',
            margin: '0 0 8px'
          }}>
            Need Help?
          </Text>
          <Text style={{ 
            color: '#1E3A8A',
            fontSize: '14px',
            margin: '0',
            lineHeight: '20px'
          }}>
            If you have any questions about your order, please don't hesitate to contact our support team. We're here to help!
          </Text>
        </Section>
      </Section>
    </Base>
  )
}

OrderPlacedTemplate.PreviewProps = {
  order: {
    id: 'test-order-id',
    display_id: '1234',
    created_at: new Date().toISOString(),
    email: 'customer@example.com',
    currency_code: 'BGN',
    items: [
      { 
        id: 'item-1', 
        title: 'Size: M, Color: Blue', 
        product_title: 'Premium Cotton T-Shirt', 
        quantity: 2, 
        unit_price: 2999 // 29.99 BGN in cents
      },
      { 
        id: 'item-2', 
        title: 'Size: 42', 
        product_title: 'Running Shoes', 
        quantity: 1, 
        unit_price: 8999 // 89.99 BGN in cents
      }
    ],
    shipping_address: {
      first_name: 'John',
      last_name: 'Doe',
      address_1: '123 Main Street',
      city: 'Sofia',
      province: 'Sofia-city',
      postal_code: '1000',
      country_code: 'BG',
      phone: '+359 888 123 456'
    },
    summary: { raw_current_order_total: { value: 11997 } } // 119.97 BGN in cents
  } as any,
  shippingAddress: {
    first_name: 'John',
    last_name: 'Doe',
    address_1: '123 Main Street',
    city: 'Sofia',
    province: 'Sofia-city',
    postal_code: '1000',
    country_code: 'BG',
    phone: '+359 888 123 456'
  },
  econtOfficeInfo: {
    officeName: 'Econt Office Sofia Center',
    officeAddress: '25 Bulgaria Blvd',
    city: 'Sofia'
  }
} as OrderPlacedPreviewProps

export default OrderPlacedTemplate
