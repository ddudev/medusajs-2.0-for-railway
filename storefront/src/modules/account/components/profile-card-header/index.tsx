"use client"

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

export default function ProfileCardHeader() {
  const { t } = useTranslation()
  return (
    <CardHeader>
      <CardTitle className="text-xl">{t("account.profile.title")}</CardTitle>
      <CardDescription className="text-base">
        {t("account.profile.description")}
      </CardDescription>
    </CardHeader>
  )
}
