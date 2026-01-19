"use client"

import { Heading, Text } from "@medusajs/ui"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  const { t } = useTranslation()

  return (
    <div className="py-16 md:py-24 px-4 flex flex-col justify-center items-center text-center" data-testid="empty-cart-message">
      <Heading
        level="h1"
        className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
      >
        {t("cart.empty")}
      </Heading>
      <Text className="text-base text-gray-600 mb-8 max-w-md">
        {t("cart.emptyDescription")}
      </Text>
      <div>
        <InteractiveLink href="/store">{t("cart.exploreProducts")}</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
