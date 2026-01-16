import { useFormState } from "react-dom"

import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import Input from "@modules/common/components/input"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { login } from "@lib/data/customer"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useFormState(login, null)
  const { t } = useTranslation()

  return (
    <div
      className="w-full flex flex-col items-center bg-background-elevated p-6 md:p-10 rounded-3xl shadow-lg border border-border-base"
      data-testid="login-page"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-text-primary uppercase mb-2 text-center">{t("login.title")}</h1>
      <p className="text-center text-base-regular text-text-secondary mb-8">
        {t("login.subtitle")}
      </p>
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-4">
          <Input
            label={t("login.email")}
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label={t("login.password")}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-8 h-12 md:h-14 text-base font-semibold transition-all">
          {t("login.signIn")}
        </SubmitButton>
      </form>
      <div className="text-center text-text-secondary text-small-regular mt-8">
        {t("login.notAMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="text-primary font-semibold hover:underline"
          data-testid="register-button"
        >
          {t("login.joinUs")}
        </button>
      </div>
    </div>
  )
}

export default Login
