"use client"

import { useActionState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { resetPassword } from "@lib/data/customer"
import Input from "@modules/common/components/input"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

const ResetPassword = () => {
  const [message, formAction] = useActionState(resetPassword, null)
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  useEffect(() => {
    // Redirect to login if no token provided
    if (!token) {
      router.push("/account")
    }
  }, [token, router])

  if (!token) {
    return null
  }

  // If reset was successful (message is null), redirect to login
  useEffect(() => {
    if (message === null) {
      // Show success message briefly, then redirect
      setTimeout(() => {
        router.push("/account?reset=success")
      }, 2000)
    }
  }, [message, router])

  return (
    <div className="w-full min-h-[60vh] flex flex-col justify-center items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-md bg-background-elevated p-6 md:p-10 rounded-3xl shadow-lg border border-border-base">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary uppercase mb-2 text-center">
          Reset Password
        </h1>
        <p className="text-center text-base-regular text-text-secondary mb-8">
          Enter your new password below
        </p>
        
        <form className="w-full" action={formAction}>
          {/* Hidden token field */}
          <input type="hidden" name="token" value={token} />
          
          <div className="flex flex-col w-full gap-y-4">
            <Input
              label="New Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              data-testid="password-input"
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              data-testid="confirm-password-input"
            />
          </div>
          
          <div className="text-sm text-text-tertiary mt-2 mb-4">
            Password must be at least 8 characters long
          </div>
          
          <ErrorMessage error={message} data-testid="reset-password-error" />
          
          <SubmitButton 
            data-testid="reset-password-button" 
            className="w-full mt-8 h-12 md:h-14 text-base font-semibold transition-all"
          >
            Reset Password
          </SubmitButton>
        </form>
        
        <div className="text-center text-text-secondary text-small-regular mt-6">
          Remember your password?{" "}
          <button
            onClick={() => router.push("/account")}
            className="text-primary font-semibold hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
