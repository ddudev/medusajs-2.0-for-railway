"use client"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

export default function OrdersPageHeader() {
  const { t } = useTranslation()
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">{t("account.orders.title")}</CardTitle>
        <CardDescription className="text-base">
          {t("account.orders.description")}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
