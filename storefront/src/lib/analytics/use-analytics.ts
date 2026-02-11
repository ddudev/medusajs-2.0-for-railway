"use client"

import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'
import type { ProductEventProperties, CartEventProperties, CheckoutEventProperties, UserProperties } from './types'
import { 
  trackGTMProductView, 
  trackGTMAddToCart, 
  trackGTMRemoveFromCart,
  trackGTMViewCart,
  trackGTMBeginCheckout,
  trackGTMAddShippingInfo,
  trackGTMAddPaymentInfo,
  trackGTMSearch,
  trackGTMSignUp,
  trackGTMLogin,
  type GTMItem,
} from './gtm-events'
import {
  trackMetaViewContent,
  trackMetaAddToCart,
  trackMetaViewCart,
  trackMetaInitiateCheckout,
  trackMetaAddPaymentInfo,
  trackMetaSearch,
  trackMetaCompleteRegistration,
  extractContentIds,
  convertToMetaContents,
} from './meta-events'

/**
 * Custom hook for PostHog analytics
 * Provides typed methods for tracking events and managing user identification
 */
export function useAnalytics() {
  const posthog = usePostHog()

  /**
   * Track a custom event
   */
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      })
    }
  }, [posthog])

  /**
   * Identify a user
   * Call this when user logs in or registers
   */
  const identifyUser = async (userId: string, traits?: UserProperties) => {
    // PostHog
    if (posthog) {
      posthog.identify(userId, traits)
    }
    
    // Update Meta Pixel advanced matching if email/phone available
    if (traits?.email || traits?.name) {
      const { updateMetaAdvancedMatching } = await import('./meta-pixel-provider')
      const { prepareAdvancedMatchingData } = await import('./privacy')
      
      const nameParts = traits.name?.split(' ') || []
      const advancedMatchingData = await prepareAdvancedMatchingData({
        email: traits.email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        country: traits.country_code,
      })
      
      if (Object.keys(advancedMatchingData).length > 0) {
        updateMetaAdvancedMatching(advancedMatchingData)
      }
    }
  }

  /**
   * Set user properties
   * Updates properties for the current user
   */
  const setUserProperties = (properties: UserProperties) => {
    if (posthog) {
      posthog.setPersonProperties(properties)
    }
  }

  /**
   * Reset user session
   * Call this on logout
   */
  const reset = () => {
    if (posthog) {
      posthog.reset()
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  const isFeatureEnabled = (flagName: string): boolean => {
    if (posthog) {
      return posthog.isFeatureEnabled(flagName) || false
    }
    return false
  }

  /**
   * Get feature flag value
   */
  const getFeatureFlag = (flagName: string): string | boolean | undefined => {
    if (posthog) {
      return posthog.getFeatureFlag(flagName)
    }
    return undefined
  }

  /**
   * Capture an exception/error
   */
  const captureException = (error: Error, context?: Record<string, any>) => {
    if (posthog) {
      posthog.capture('exception', {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name,
        ...context,
      })
    }
  }

  /**
   * Track product viewed
   */
  const trackProductViewed = useCallback((properties: ProductEventProperties) => {
    // PostHog
    trackEvent('product_viewed', properties)
    
    // GTM - view_item
    if (properties.product_id) {
      trackGTMProductView({
        currency: properties.currency || 'EUR',
        value: properties.product_price || 0,
        items: [{
          item_id: properties.product_id,
          item_name: properties.product_name,
          item_category: properties.product_category,
          item_variant: properties.variant_name,
          price: properties.product_price || 0,
          quantity: 1,
        }],
      })
    }
    
    // Meta Pixel - ViewContent
    if (properties.product_id) {
      trackMetaViewContent({
        content_ids: [properties.variant_id || properties.product_id],
        content_name: properties.product_name,
        content_type: 'product',
        content_category: properties.product_category,
        currency: properties.currency || 'EUR',
        value: properties.product_price || 0,
        contents: [{
          id: properties.variant_id || properties.product_id,
          quantity: 1,
          item_price: properties.product_price,
        }],
      })
    }
  }, [trackEvent])

  /**
   * Track product added to cart
   */
  const trackProductAddedToCart = (properties: ProductEventProperties & { cart_value?: number }) => {
    // PostHog
    trackEvent('product_added_to_cart', properties)
    
    // GTM - add_to_cart
    if (properties.product_id) {
      trackGTMAddToCart({
        currency: properties.currency || 'EUR',
        value: (properties.product_price || 0) * (properties.quantity || 1),
        items: [{
          item_id: properties.product_id,
          item_name: properties.product_name,
          item_category: properties.product_category,
          item_variant: properties.variant_name,
          price: properties.product_price || 0,
          quantity: properties.quantity || 1,
        }],
      })
    }
    
    // Meta Pixel - AddToCart
    if (properties.product_id) {
      trackMetaAddToCart({
        content_ids: [properties.variant_id || properties.product_id],
        content_name: properties.product_name,
        content_type: 'product',
        currency: properties.currency || 'EUR',
        value: (properties.product_price || 0) * (properties.quantity || 1),
        contents: [{
          id: properties.variant_id || properties.product_id,
          quantity: properties.quantity || 1,
          item_price: properties.product_price,
        }],
      })
    }
  }

  /**
   * Track product removed from cart
   */
  const trackProductRemovedFromCart = (properties: ProductEventProperties & { cart_value?: number }) => {
    // PostHog
    trackEvent('product_removed_from_cart', properties)
    
    // GTM - remove_from_cart
    if (properties.product_id) {
      trackGTMRemoveFromCart({
        currency: properties.currency || 'EUR',
        value: (properties.product_price || 0) * (properties.quantity || 1),
        items: [{
          item_id: properties.product_id,
          item_name: properties.product_name,
          item_category: properties.product_category,
          item_variant: properties.variant_name,
          price: properties.product_price || 0,
          quantity: properties.quantity || 1,
        }],
      })
    }
  }

  /**
   * Track cart viewed
   */
  const trackCartViewed = (properties: CartEventProperties) => {
    // PostHog
    trackEvent('cart_viewed', properties)

    // GTM - view_cart
    if (properties.items && properties.items.length > 0) {
      trackGTMViewCart({
        currency: properties.currency,
        value: properties.cart_value,
        items: properties.items.map(item => ({
          item_id: item.product_id,
          item_name: '', // Product name not in CartEventProperties items
          item_variant: item.variant_id,
          price: item.price,
          quantity: item.quantity,
        })),
      })
    }

    // Meta - ViewCart
    if (properties.items && properties.items.length > 0) {
      trackMetaViewCart({
        content_ids: properties.items.map(item => item.variant_id || item.product_id),
        currency: properties.currency,
        value: properties.cart_value,
        num_items: properties.item_count,
        contents: properties.items.map(item => ({
          id: item.variant_id || item.product_id,
          quantity: item.quantity,
          item_price: item.price,
        })),
      })
    }
  }

  /**
   * Track cart updated
   */
  const trackCartUpdated = (properties: CartEventProperties & { line_item_id?: string; new_quantity?: number }) => {
    trackEvent('cart_updated', properties)
  }

  /**
   * Track checkout started
   */
  const trackCheckoutStarted = (properties: CheckoutEventProperties & { items?: any[] }) => {
    // PostHog
    trackEvent('checkout_started', properties)
    
    // GTM - begin_checkout
    if (properties.items && properties.items.length > 0) {
      trackGTMBeginCheckout({
        currency: properties.currency,
        value: properties.cart_value,
        items: properties.items.map(item => ({
          item_id: item.product_id,
          item_name: item.product_name || '',
          item_variant: item.variant_id,
          price: item.price,
          quantity: item.quantity,
        })),
      })
    }
    
    // Meta Pixel - InitiateCheckout
    if (properties.items && properties.items.length > 0) {
      trackMetaInitiateCheckout({
        content_ids: extractContentIds(properties.items),
        currency: properties.currency,
        value: properties.cart_value,
        num_items: properties.item_count,
        contents: convertToMetaContents(properties.items.map(item => ({
          id: item.variant_id || item.product_id,
          quantity: item.quantity,
          price: item.price,
        }))),
      })
    }
  }

  /**
   * Track checkout step completed
   */
  const trackCheckoutStepCompleted = (properties: CheckoutEventProperties) => {
    trackEvent('checkout_step_completed', properties)
  }

  /**
   * Track checkout contact completed
   */
  const trackCheckoutContactCompleted = (properties: CheckoutEventProperties & { has_email?: boolean; has_phone?: boolean; country_code?: string }) => {
    trackEvent('checkout_contact_completed', properties)
  }

  /**
   * Track checkout shipping method selected
   */
  const trackCheckoutShippingMethodSelected = (properties: CheckoutEventProperties & { shipping_method?: string; shipping_price?: number; items?: any[] }) => {
    // PostHog
    trackEvent('checkout_shipping_method_selected', properties)
    
    // GTM - add_shipping_info
    if (properties.items && properties.items.length > 0) {
      trackGTMAddShippingInfo({
        currency: properties.currency,
        value: properties.cart_value,
        shipping_tier: properties.shipping_method,
        items: properties.items.map(item => ({
          item_id: item.product_id,
          item_name: item.product_name || '',
          item_variant: item.variant_id,
          price: item.price,
          quantity: item.quantity,
        })),
      })
    }
  }

  /**
   * Track checkout payment method selected
   */
  const trackCheckoutPaymentMethodSelected = (properties: CheckoutEventProperties & { payment_method?: string; items?: any[] }) => {
    // PostHog
    trackEvent('checkout_payment_method_selected', properties)
    
    // GTM - add_payment_info
    if (properties.items && properties.items.length > 0) {
      trackGTMAddPaymentInfo({
        currency: properties.currency,
        value: properties.cart_value,
        payment_type: properties.payment_method,
        items: properties.items.map(item => ({
          item_id: item.product_id,
          item_name: item.product_name || '',
          item_variant: item.variant_id,
          price: item.price,
          quantity: item.quantity,
        })),
      })
    }
    
    // Meta Pixel - AddPaymentInfo
    if (properties.items && properties.items.length > 0) {
      trackMetaAddPaymentInfo({
        content_ids: extractContentIds(properties.items),
        currency: properties.currency,
        value: properties.cart_value,
        contents: convertToMetaContents(properties.items.map(item => ({
          id: item.variant_id || item.product_id,
          quantity: item.quantity,
          price: item.price,
        }))),
      })
    }
  }

  /**
   * Track checkout abandoned
   */
  const trackCheckoutAbandoned = (properties: CheckoutEventProperties & { step_abandoned_at?: string; time_in_checkout?: number; reason?: string }) => {
    trackEvent('checkout_abandoned', properties)
  }

  return {
    // Core methods
    trackEvent,
    identifyUser,
    setUserProperties,
    reset,
    isFeatureEnabled,
    getFeatureFlag,
    captureException,
    // Convenience methods
    trackProductViewed,
    trackProductAddedToCart,
    trackProductRemovedFromCart,
    trackCartViewed,
    trackCartUpdated,
    trackCheckoutStarted,
    trackCheckoutStepCompleted,
    trackCheckoutContactCompleted,
    trackCheckoutShippingMethodSelected,
    trackCheckoutPaymentMethodSelected,
    trackCheckoutAbandoned,
    // Direct access to PostHog instance (for advanced usage)
    posthog,
  }
}
