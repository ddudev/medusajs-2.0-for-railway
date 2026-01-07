import React from "react"
import { getTranslation } from "@lib/i18n/server"
import type { TranslationKeys } from "@lib/i18n/config"
import {
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccessTime as TimeIcon,
  Map as MapIcon,
} from "@mui/icons-material"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ContactDetailsProps = {
  translations: TranslationKeys
  countryCode: string
}

export default function ContactDetails({
  translations,
  countryCode,
}: ContactDetailsProps) {
  const t = (key: string) => getTranslation(translations, key)

  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-text-primary mb-6">
        {t("contact.details.title") || "Contact Details"}
      </h2>

      <div className="space-y-6">
        {/* Central Office */}
        <div className="flex items-start gap-4">
          <LocationIcon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-text-primary mb-1">
              {t("contact.details.centralOffice") || "Central Management"}
            </h3>
            <p className="text-text-secondary">
              Be Healthy Group d.o.o.
              <br />
              Poslovna cona A10
              <br />
              4208 Šenčur
            </p>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start gap-4">
          <PhoneIcon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-text-primary mb-1">
              {t("contact.details.phone") || "Phone Number"}
            </h3>
            <a
              href="tel:024928459"
              className="text-primary hover:underline"
            >
              02 492 84 59
            </a>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start gap-4">
          <EmailIcon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-text-primary mb-1">
              {t("contact.details.email") || "Email"}
            </h3>
            <a
              href="mailto:info@futunatura.bg"
              className="text-primary hover:underline"
            >
              info@futunatura.bg
            </a>
          </div>
        </div>

        {/* Working Hours */}
        <div className="flex items-start gap-4">
          <TimeIcon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-text-primary mb-1">
              {t("contact.details.workingHours") || "Working Hours"}
            </h3>
            <p className="text-text-secondary">
              {t("contact.details.mondayThursday") ||
                "Monday - Thursday: 8:00 - 16:00"}
              <br />
              {t("contact.details.friday") || "Friday: 8:00 - 14:00"}
              <br />
              {t("contact.details.weekend") || "Saturday and Sunday: Closed"}
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="flex items-start gap-4">
          <MapIcon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-text-primary mb-1">
              {t("contact.details.map") || "Map"}
            </h3>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Poslovna+cona+A10,+4208+Šenčur"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t("contact.details.openMap") || "Open Google Map"}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
