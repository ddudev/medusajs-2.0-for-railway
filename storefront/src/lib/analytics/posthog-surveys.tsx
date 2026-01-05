"use client"

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

/**
 * PostHog Surveys Component
 * Triggers surveys at key moments in the customer journey
 */
export function PostHogSurveys() {
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog) {
      return
    }

    // Surveys are configured in PostHog dashboard
    // This component just ensures PostHog is ready for surveys
    // Actual survey triggers are configured in PostHog dashboard settings

    // Example: You can programmatically show surveys
    // posthog.showSurvey('survey-id')

    return () => {
      // Cleanup if needed
    }
  }, [posthog])

  // This component doesn't render anything
  return null
}

/**
 * Hook to show a survey programmatically
 */
export function usePostHogSurvey() {
  const posthog = usePostHog()

  const showSurvey = (surveyId: string) => {
    if (posthog) {
      posthog.showSurvey(surveyId)
    }
  }

  return { showSurvey }
}
