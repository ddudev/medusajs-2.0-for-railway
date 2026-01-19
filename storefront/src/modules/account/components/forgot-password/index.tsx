"use client"

import { useActionState, useState } from "react"
import { requestPasswordReset } from "@lib/data/customer"
import Input from "@modules/common/components/input"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

type ForgotPasswordProps = {
  onClose: () => void
}

const ForgotPassword = ({ onClose }: ForgotPasswordProps) => {
  const [message, formAction] = useActionState(requestPasswordReset, null)
  const [success, setSuccess] = useState(false)
  const { t } = useTranslation()

  // If request was successful (message is null), show success state
  const handleFormAction = async (formData: FormData) => {
    const result = await requestPasswordReset(null, formData)
    if (result === null) {
      setSuccess(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-background-elevated rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        {success ? (
          // Success state
          <div className="text-center">
            <div className="w-16 h-16 bg-success-base/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success-base" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              Check Your Email
            </h2>
            <p className="text-text-secondary mb-6">
              If an account exists with that email address, we've sent a password reset link. Please check your inbox and follow the instructions.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-primary-base text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-hover transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          // Form state
          <>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Forgot Password?
            </h2>
            <p className="text-text-secondary mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form action={formAction} className="space-y-4">
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
              
              <ErrorMessage error={message} />
              
              <SubmitButton className="w-full h-12 text-base font-semibold transition-all">
                Send Reset Link
              </SubmitButton>
            </form>
            
            <button
              onClick={onClose}
              className="w-full mt-4 text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
