import { Metadata } from "next"
import { Suspense } from "react"
import ResetPassword from "@modules/account/components/reset-password"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your account password.",
}

function ResetPasswordLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col justify-center items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-md bg-background-elevated p-6 md:p-10 rounded-3xl shadow-lg border border-border-base animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-8"></div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPassword />
    </Suspense>
  )
}
