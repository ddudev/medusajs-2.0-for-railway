"use client"

import { useEffect } from "react"
import { useFormStatus } from "react-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import useToggleState from "@lib/hooks/use-toggle-state"
import { cn } from "@/lib/utils"

interface AccountInfoProps {
  label: string
  currentInfo: string | React.ReactNode
  isSuccess?: boolean
  isError?: boolean
  errorMessage?: string
  clearState: () => void
  children?: React.ReactNode
  "data-testid"?: string
}

function AccountInfo({
  label,
  currentInfo,
  isSuccess,
  isError,
  clearState,
  errorMessage,
  children,
  "data-testid": dataTestid,
}: AccountInfoProps) {
  const { t } = useTranslation()
  const { state, close, toggle } = useToggleState()
  const { pending } = useFormStatus()

  const handleToggle = () => {
    clearState()
    setTimeout(() => toggle(), 100)
  }

  useEffect(() => {
    if (isSuccess) {
      close()
    }
  }, [isSuccess, close])

  const defaultError = t("account.profile.error")

  return (
    <div className="text-sm" data-testid={dataTestid}>
      <div className="flex flex-col gap-2 small:flex-row small:items-end small:justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <div className="mt-1">
            {typeof currentInfo === "string" ? (
              <span
                className="font-medium text-foreground"
                data-testid="current-info"
              >
                {currentInfo}
              </span>
            ) : (
              currentInfo
            )}
          </div>
        </div>
        <div className="shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="min-w-[100px]"
            onClick={handleToggle}
            type={state ? "reset" : "button"}
            data-testid="edit-button"
            data-active={state}
          >
            {state ? t("account.profile.cancel") : t("account.profile.edit")}
          </Button>
        </div>
      </div>

      {isSuccess && (
        <div
          className="mt-3 overflow-hidden transition-[max-height,opacity] duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out"
          data-testid="success-message"
        >
          <Badge variant="default" className="bg-green-600 hover:bg-green-600">
            {label} {t("account.profile.updatedSuccess")}
          </Badge>
        </div>
      )}

      {isError && (
        <div
          className="mt-3 overflow-hidden transition-[max-height,opacity] duration-300"
          data-testid="error-message"
        >
          <Badge variant="destructive">
            {errorMessage ?? defaultError}
          </Badge>
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300",
          state ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-3 py-4">
          <div>{children}</div>
          <div className="flex justify-end">
            <Button
              disabled={pending}
              className="w-full small:max-w-[140px]"
              type="submit"
              data-testid="save-button"
            >
              {pending ? "..." : t("account.profile.saveChanges")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountInfo
