import React from "react"
import { getTranslation } from "@lib/i18n/server"
import type { TranslationKeys } from "@lib/i18n/config"
import Image from "next/image"

type AboutContentProps = {
  translations: TranslationKeys
}

export default function AboutContent({ translations }: AboutContentProps) {
  const t = (key: string) => getTranslation(translations, key)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-12">
      {/* Left Column: Company Description */}
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-primary">
          {t("about.content.title") ||
            "FutuNatura - the path to your health!"}
        </h2>

        <div className="space-y-4 text-text-secondary">
          <p>
            {t("about.content.paragraph1") ||
              "We are an international online store that sells food supplements, cosmetics and medical devices since 2016."}
          </p>

          <p>
            {t("about.content.paragraph2") ||
              "Our principles are evident from the name FutuNatura, as 'Futu' is related to the English word 'future' and strives to meet the needs of modern man, 'Natura' is related to nature and everything that comes from it."}
          </p>

          <div>
            <h3 className="font-semibold text-text-primary mb-2">
              {t("about.content.findOnWebsite") ||
                "On our website you will find:"}
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t("about.content.productCount") || "over 3000 products,"}</li>
              <li>
                {t("about.content.pricesQuality") ||
                  "top prices and guaranteed quality,"}
              </li>
              <li>
                {t("about.content.freeEbooks") || "free e-books,"}
              </li>
              <li>
                {t("about.content.calculators") ||
                  "5 calculators for calculating body needs and cycles."}
              </li>
            </ul>
          </div>

          <p>
            {t("about.content.vision") ||
              "Our vision is to become the largest online store with health products in Europe. We have excellent success in this, as we are currently in 15 countries of the European Union, and soon new markets will join us."}
          </p>
        </div>
      </div>

      {/* Right Column: Map Visualization */}
      <div className="relative w-full h-[400px] lg:h-[500px] bg-background-elevated rounded-lg overflow-hidden">
        <Image
          src="/images/futunatura-countries-map.jpg"
          alt={t("about.content.mapAlt") || "Europe Map - Countries where we operate"}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority={false}
        />
      </div>
    </div>
  )
}
