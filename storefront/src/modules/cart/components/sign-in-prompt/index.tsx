"use client"

import { Button, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  const { t } = useTranslation()

  return (
    <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
      <div className="flex-1">
        <Heading level="h2" className="text-lg md:text-xl font-bold text-gray-900 mb-2">
          {t("cart.signIn.title")}
        </Heading>
        <Text className="text-sm text-gray-600">
          {t("cart.signIn.description")}
        </Text>
      </div>
      <div className="flex-shrink-0">
        <LocalizedClientLink href="/account">
          <Button 
            variant="secondary" 
            className="h-10 px-6 font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200" 
            data-testid="sign-in-button"
          >
            {t("cart.signIn.button")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
