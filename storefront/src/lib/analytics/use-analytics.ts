"use client"

import { usePostHog } from 'posthog-js/react'
import type { ProductEventProperties, CartEventProperties, CheckoutEventProperties, UserProperties } from './types'

/**
 * Custom hook for PostHog analytics
 * Provides typed methods for tracking events and managing user identification
 */
export function useAnalytics() {
  const posthog = usePostHog()

  /**
   * Track a custom event
   */
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * Identify a user
   * Call this when user logs in or registers
   */
  const identifyUser = (userId: string, traits?: UserProperties) => {
    if (posthog) {
      posthog.identify(userId, traits)
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
  const trackProductViewed = (properties: ProductEventProperties) => {
    trackEvent('product_viewed', properties)
  }

  /**
   * Track product added to cart
   */
  const trackProductAddedToCart = (properties: ProductEventProperties & { cart_value?: number }) => {
    trackEvent('product_added_to_cart', properties)
  }

  /**
   * Track product removed from cart
   */
  const trackProductRemovedFromCart = (properties: ProductEventProperties & { cart_value?: number }) => {
    trackEvent('product_removed_from_cart', properties)
  }

  /**
   * Track cart viewed
   */
  const trackCartViewed = (properties: CartEventProperties) => {
    trackEvent('cart_viewed', properties)
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
  const trackCheckoutStarted = (properties: CheckoutEventProperties) => {
    trackEvent('checkout_started', properties)
  }

  /**
   * Track checkout step completed
   */
  const trackCheckoutStepCompleted = (properties: CheckoutEventProperties) => {
    trackEvent('checkout_step_completed', properties)
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
    trackCheckoutAbandoned,
    // Direct access to PostHog instance (for advanced usage)
    posthog,
  }
}
