"use client"

import { useActionState } from "react"

import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { trackEmailCapture, trackPhoneCapture } from "@lib/analytics/lead-capture"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)
  const { t } = useTranslation()

  // Track email capture on blur
  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value
    if (email) {
      trackEmailCapture({
        email,
        source: 'registration',
      })
    }
  }

  // Track phone capture on blur
  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const phone = e.target.value
    if (phone) {
      trackPhoneCapture({
        phone,
        source: 'registration',
      })
    }
  }

  return (
    <div
      className="w-full flex flex-col items-center bg-background-elevated p-6 md:p-10 rounded-3xl shadow-lg border border-border-base"
      data-testid="register-page"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-text-primary uppercase mb-2 text-center">
        {t("login.createAccount")}
      </h1>
      <p className="text-center text-base-regular text-text-secondary mb-8">
        {t("login.createAccountSubtitle")}
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-4">
          <Input
            label={t("login.firstName")}
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label={t("login.lastName")}
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label={t("login.email")}
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
            onBlur={handleEmailBlur}
          />
          <Input
            label={t("login.phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
            onBlur={handlePhoneBlur}
          />
          <Input
            label={t("login.password")}
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="register-error" />
        <div className="text-center text-text-secondary text-small-regular mt-6 leading-relaxed">
          {t("login.agreeTo")}{" "}
          <LocalizedClientLink
            href="/privacy-policy"
            className="text-primary font-semibold hover:underline"
          >
            {t("login.privacyPolicy")}
          </LocalizedClientLink>{" "}
          {t("login.and")}{" "}
          <LocalizedClientLink
            href="/terms-of-use"
            className="text-primary font-semibold hover:underline"
          >
            {t("login.termsOfUse")}
          </LocalizedClientLink>
          .
        </div>
        <SubmitButton className="w-full mt-8 h-12 md:h-14 text-base font-semibold transition-all" data-testid="register-button">
          {t("login.join")}
        </SubmitButton>
      </form>
      <div className="text-center text-text-secondary text-small-regular mt-8">
        {t("login.alreadyAMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="text-primary font-semibold hover:underline"
        >
          {t("login.signIn")}
        </button>
      </div>
    </div>
  )
}

export default Register
