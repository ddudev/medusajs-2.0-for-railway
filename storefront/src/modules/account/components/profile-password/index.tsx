"use client"

import React, { useEffect } from "react"
import { useActionState } from "react"

import { useTranslation } from "@lib/i18n/hooks/use-translation"
import Input from "@modules/common/components/input"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfilePassword: React.FC<MyInformationProps> = () => {
  const { t } = useTranslation()
  const [successState, setSuccessState] = React.useState(false)

  // TODO: Add support for password updates
  const [state, formAction] = useActionState(
    async (
      _prev: { success: boolean; error: string | null },
      _formData: FormData
    ) => ({ success: false, error: null }),
    { success: false, error: null }
  )

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  return (
    <form action={formAction} onReset={() => clearState()} className="w-full">
      <AccountInfo
        label={t("account.profile.password")}
        currentInfo={
          <span className="text-muted-foreground">
            {t("account.profile.passwordNotShown")}
          </span>
        }
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error ?? undefined}
        clearState={clearState}
        data-testid="account-password-editor"
      >
        <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
          <Input
            label={t("account.profile.oldPassword")}
            name="old_password"
            required
            type="password"
            data-testid="old-password-input"
          />
          <Input
            label={t("account.profile.newPassword")}
            type="password"
            name="new_password"
            required
            data-testid="new-password-input"
          />
          <Input
            label={t("account.profile.confirmPassword")}
            type="password"
            name="confirm_password"
            required
            data-testid="confirm-password-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfilePassword
