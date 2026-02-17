import { getCategoriesList } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import { Text } from "@medusajs/ui"
import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getTranslations, getTranslation } from "@lib/i18n/server"
import NewsletterForm from "./newsletter-form"
import { CookieTriggerSafe } from "@/components/cookie-consent"

type FooterProps = {
  countryCode?: string
}

export default async function Footer({ countryCode = "us" }: FooterProps) {
  const { collections } = await getCollectionsList(0, 6)
  const { product_categories } = await getCategoriesList(0, 6)

  // Get translations for footer links based on country code
  const normalizedCountryCode = countryCode.toLowerCase()
  const translations = await getTranslations(normalizedCountryCode)

  return (
    <footer className="w-full">
      {/* Newsletter Banner */}
      <div className="w-full bg-gradient-to-r from-[#B95A0C] to-[#EB7310]">
        <div className="content-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-white">
              <span className="text-5xl font-bold">
                {getTranslation(translations, "footer.newsletter.discount") || "-10%"}
              </span>
              <p className="text-lg max-w-xs font-semibold">
                {getTranslation(translations, "footer.newsletter.title") || "Register now and get 10% discount on your first order"}
              </p>
            </div>
            <NewsletterForm
              placeholderText={getTranslation(translations, "footer.newsletter.placeholder") || "Enter your email"}
              subscribeText={getTranslation(translations, "footer.newsletter.subscribe") || "Subscribe"}
              consentText={getTranslation(translations, "footer.newsletter.consent") || "I allow the use of email address for marketing purposes"}
            />
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="w-full bg-interactive text-white">
        <div className="content-container flex flex-col w-full">
          <div className="flex flex-col md:flex-row items-start justify-between py-12 gap-8">
            {/* Logo and Social */}
            <div className="flex flex-col gap-4">
              <LocalizedClientLink
                href="/"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/images/nez-logo-color-light.svg"
                  alt="Nez Logo"
                  width={120}
                  height={30}
                  className="h-8 w-auto"
                />
              </LocalizedClientLink>
              <div className="flex gap-3">
                <a href="#" className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary-hover transition-colors">
                  <span className="text-white text-sm font-bold">f</span>
                </a>
                <a href="#" className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary-hover transition-colors">
                  <span className="text-white text-sm font-bold">in</span>
                </a>
                <a href="#" className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary-hover transition-colors">
                  <span className="text-white text-sm">📷</span>
                </a>
              </div>
            </div>

            {/* Footer Links */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 max-w-2xl">
              {/* Company Column */}
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-sm">
                  {getTranslation(translations, "footer.company") || "Company"}
                </span>
                <ul className="flex flex-col gap-2 text-sm text-gray-300">
                  <li>
                    <LocalizedClientLink
                      href="/about"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.aboutUs") || "About us"}
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      href="/brands"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.brands") || "Brands"}
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      href="/stores"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.stores") || "Stores"}
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      href="/careers"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.careersWithUs") || "Careers with us"}
                    </LocalizedClientLink>
                  </li>
                </ul>
              </div>

              {/* Information Column */}
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-sm">
                  {getTranslation(translations, "footer.information") || "Information"}
                </span>
                <ul className="flex flex-col gap-2 text-sm text-gray-300">
                  <li>
                    <LocalizedClientLink
                      href="/faq"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.faq") || "FAQ"}
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      href="/terms"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.generalConditions") || "General conditions"}
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      href="/delivery"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.deliveryAndPayment") || "Delivery and payment"}
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      href="/assistance"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.termsOfDeliveryAndAssistance") || "Terms of delivery and assistance"}
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      href="/gdpr"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.gdprInstructions") || "GDPR instructions"}
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      href="/privacy"
                      className="hover:text-primary transition-colors"
                    >
                      {getTranslation(translations, "footer.privacyPolicy") || "Privacy policy"}
                    </LocalizedClientLink>
                  </li>
                </ul>
              </div>

              {/* Help and Support Column */}
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-sm">
                  {getTranslation(translations, "footer.helpAndSupport") || "Help and Support"}
                </span>
                <ul className="flex flex-col gap-2 text-sm text-gray-300">
                  <li className="font-semibold text-white">02 492 84 59</li>
                  <li>info@futunatura.bg</li>
                  <li className="mt-2">
                    <div className="text-xs">
                      {getTranslation(translations, "footer.mondayFriday") || "Monday - Friday: 8:00 - 14:00 h"}
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <Text className="text-xs text-gray-400">
              {getTranslation(translations, "footer.copyright", { year: new Date().getFullYear().toString() }) || `© ${new Date().getFullYear()} NEZ.BG. All rights reserved.`}
            </Text>

            <div className="flex items-center gap-4">
              <CookieTriggerSafe
                variant="text"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              />
              <Text className="text-xs text-gray-400">
                {getTranslation(translations, "footer.poweredBy") || "Powered by Merch Solutions"}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
