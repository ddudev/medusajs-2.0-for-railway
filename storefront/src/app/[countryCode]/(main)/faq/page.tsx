import { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations, getTranslation } from "@lib/i18n/server"
import FAQContent from "@modules/static-pages/faq/faq-content"
import SuspenseLoading from "@modules/common/components/suspense-loading"
import faqData from "@lib/data/faq.json"
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
  const title = getTranslation(translations, "faq.title") || "FAQ"
  const description =
    getTranslation(translations, "faq.description") ||
    "Frequently asked questions"

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

export default async function FAQPage({ params }: Props) {
  const resolvedParams = await params
  const normalizedCountryCode =
    typeof resolvedParams?.countryCode === "string"
      ? resolvedParams.countryCode.toLowerCase()
      : "us"

  const translations = await getTranslations(normalizedCountryCode)
  const pageTitle = getTranslation(translations, "faq.title") || "FAQ"

  // Generate breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    {
      name: getTranslation(translations, "common.home") || "Home",
      url: `/${normalizedCountryCode}`,
    },
    {
      name: pageTitle,
      url: `/${normalizedCountryCode}/faq`,
    },
  ])

  return (
    <>
      <JsonLdScript id="faq-breadcrumb-schema" data={breadcrumbSchema} />
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

        <Suspense fallback={<SuspenseLoading />}>
          <FAQContent categories={faqData.categories} />
        </Suspense>
      </div>
    </>
  )
}
