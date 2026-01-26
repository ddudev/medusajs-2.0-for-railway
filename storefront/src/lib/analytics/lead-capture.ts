/**
 * Lead capture utility for email/phone tracking
 * Tracks when users provide contact information
 */

import { trackMetaLead } from './meta-events'
import { trackGTMCustomEvent } from './gtm-events'
import { updateMetaAdvancedMatching } from './meta-pixel-provider'
import { prepareAdvancedMatchingData, isValidEmail, isValidPhone, shouldTrackEvent } from './privacy'

export type LeadSource = 'registration' | 'checkout' | 'newsletter' | 'contact' | 'account'

/**
 * Track email capture
 */
export async function trackEmailCapture(params: {
  email: string
  source: LeadSource
  additionalData?: Record<string, any>
}) {
  if (!isValidEmail(params.email)) {
    return
  }

  // Rate limit to prevent duplicate events
  const eventKey = `email_${params.email}_${params.source}`
  if (!shouldTrackEvent(eventKey)) {
    return
  }

  // Track to Meta Pixel
  trackMetaLead({
    content_name: 'Email Captured',
    content_category: `lead_${params.source}`,
    lead_source: params.source,
  })

  // Track to GTM
  trackGTMCustomEvent('email_captured', {
    lead_source: params.source,
    ...params.additionalData,
  })

  // Update Meta Pixel advanced matching
  const advancedMatchingData = await prepareAdvancedMatchingData({
    email: params.email,
  })
  updateMetaAdvancedMatching(advancedMatchingData)
}

/**
 * Track phone capture
 */
export async function trackPhoneCapture(params: {
  phone: string
  source: LeadSource
  additionalData?: Record<string, any>
}) {
  if (!isValidPhone(params.phone)) {
    return
  }

  // Rate limit to prevent duplicate events
  const eventKey = `phone_${params.phone}_${params.source}`
  if (!shouldTrackEvent(eventKey)) {
    return
  }

  // Track to Meta Pixel
  trackMetaLead({
    content_name: 'Phone Captured',
    content_category: `lead_${params.source}`,
    lead_source: params.source,
  })

  // Track to GTM
  trackGTMCustomEvent('phone_captured', {
    lead_source: params.source,
    ...params.additionalData,
  })

  // Update Meta Pixel advanced matching
  const advancedMatchingData = await prepareAdvancedMatchingData({
    phone: params.phone,
  })
  updateMetaAdvancedMatching(advancedMatchingData)
}

/**
 * Track email and phone capture together
 */
export async function trackContactInfoCapture(params: {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  source: LeadSource
  additionalData?: Record<string, any>
}) {
  const hasValidEmail = params.email && isValidEmail(params.email)
  const hasValidPhone = params.phone && isValidPhone(params.phone)

  if (!hasValidEmail && !hasValidPhone) {
    return
  }

  // Rate limit
  const eventKey = `contact_${params.email}_${params.phone}_${params.source}`
  if (!shouldTrackEvent(eventKey)) {
    return
  }

  // Track to Meta Pixel
  trackMetaLead({
    content_name: 'Contact Info Captured',
    content_category: `lead_${params.source}`,
    lead_source: params.source,
  })

  // Track to GTM
  trackGTMCustomEvent('contact_info_captured', {
    lead_source: params.source,
    has_email: hasValidEmail,
    has_phone: hasValidPhone,
    ...params.additionalData,
  })

  // Update Meta Pixel advanced matching with all available data
  const advancedMatchingData = await prepareAdvancedMatchingData({
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
  })
  
  if (Object.keys(advancedMatchingData).length > 0) {
    updateMetaAdvancedMatching(advancedMatchingData)
  }
}

/**
 * Track newsletter signup
 */
export async function trackNewsletterSignup(params: {
  email: string
  source: 'homepage' | 'footer'
  hasMarketingConsent?: boolean
}) {
  if (!isValidEmail(params.email)) {
    return
  }

  // Rate limit
  const eventKey = `newsletter_${params.email}_${params.source}`
  if (!shouldTrackEvent(eventKey)) {
    return
  }

  // Track to Meta Pixel as Lead
  trackMetaLead({
    content_name: 'Newsletter Signup',
    content_category: 'newsletter',
    lead_source: 'newsletter',
  })

  // Track to GTM
  trackGTMCustomEvent('newsletter_signup', {
    source: params.source,
    has_marketing_consent: params.hasMarketingConsent,
  })

  // Update advanced matching
  const advancedMatchingData = await prepareAdvancedMatchingData({
    email: params.email,
  })
  updateMetaAdvancedMatching(advancedMatchingData)
}

/**
 * Track contact form submission
 */
export async function trackContactFormSubmit(params: {
  email?: string
  phone?: string
  name?: string
  subject?: string
}) {
  if (!params.email && !params.phone) {
    return
  }

  // Rate limit
  const eventKey = `contact_form_${params.email || params.phone}`
  if (!shouldTrackEvent(eventKey)) {
    return
  }

  // Track to Meta Pixel
  trackMetaLead({
    content_name: 'Contact Form',
    content_category: 'contact_form',
    lead_source: 'contact',
  })

  // Track to GTM
  trackGTMCustomEvent('contact_form_submit', {
    has_email: !!params.email,
    has_phone: !!params.phone,
    subject: params.subject,
  })

  // Update advanced matching
  if (params.email || params.phone) {
    const advancedMatchingData = await prepareAdvancedMatchingData({
      email: params.email,
      phone: params.phone,
    })
    updateMetaAdvancedMatching(advancedMatchingData)
  }
}
