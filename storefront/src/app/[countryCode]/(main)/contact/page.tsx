import { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations, getTranslation } from "@lib/i18n/server"
import ContactForm from "@modules/static-pages/contact/contact-form"
import ContactDetails from "@modules/static-pages/contact/contact-details"
import ContactMap from "@modules/static-pages/contact/contact-map"
import SuspenseLoading from "@modules/common/components/suspense-loading"
import { generateBreadcrumbSchema } from "@lib/seo/breadcrumb-schema"
import JsonLdScript from "components/seo/json-ld-script"

type Props = {
  params: Promise<{ countryCode: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const normalizedCountryCode =
    typeof resolvedParams?.countryCode === "string"
      ? resolvedParams.countryCode.toLowerCase()
      : "us"

  const translations = await getTranslations(normalizedCountryCode)
  const title = getTranslation(translations, "contact.title") || "Contact"
  const description =
    getTranslation(translations, "contact.description") ||
    "Get in touch with us"

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function ContactPage({ params }: Props) {
  const resolvedParams = await params
  const normalizedCountryCode =
    typeof resolvedParams?.countryCode === "string"
      ? resolvedParams.countryCode.toLowerCase()
      : "us"

  const translations = await getTranslations(normalizedCountryCode)
  const pageTitle = getTranslation(translations, "contact.title") || "Contact"

  // Generate breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    {
      name: getTranslation(translations, "common.home") || "Home",
      url: `/${normalizedCountryCode}`,
    },
    {
      name: pageTitle,
      url: `/${normalizedCountryCode}/contact`,
    },
  ])

  return (
    <>
      <JsonLdScript id="contact-breadcrumb-schema" data={breadcrumbSchema} />
      <div className="content-container py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            {pageTitle}
          </h1>
          <nav className="text-sm text-text-secondary">
            <a
              href={`/${normalizedCountryCode}`}
              className="hover:text-text-primary transition-colors"
            >
              {getTranslation(translations, "common.home") || "Home"}
            </a>
            <span className="mx-2">/</span>
            <span>{pageTitle}</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          <Suspense fallback={<SuspenseLoading />}>
            <ContactForm />
          </Suspense>

          <div>
            <Suspense fallback={<SuspenseLoading />}>
              <ContactDetails
                translations={translations}
                countryCode={normalizedCountryCode}
              />
            </Suspense>
            <Suspense fallback={<div className="h-96 bg-gray-200 rounded-lg animate-pulse mt-6" />}>
              <ContactMap />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
