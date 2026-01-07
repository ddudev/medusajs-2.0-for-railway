import { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations, getTranslation } from "@lib/i18n/server"
import AboutContent from "@modules/static-pages/about/about-content"
import StatisticsCards from "@modules/static-pages/about/statistics-cards"
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
  const title = getTranslation(translations, "about.title") || "About Us"
  const description =
    getTranslation(translations, "about.description") ||
    "Learn more about our company"

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

export default async function AboutPage({ params }: Props) {
  const resolvedParams = await params
  const normalizedCountryCode =
    typeof resolvedParams?.countryCode === "string"
      ? resolvedParams.countryCode.toLowerCase()
      : "us"

  const translations = await getTranslations(normalizedCountryCode)
  const pageTitle = getTranslation(translations, "about.title") || "About Us"

  // Generate breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    {
      name: getTranslation(translations, "common.home") || "Home",
      url: `/${normalizedCountryCode}`,
    },
    {
      name: pageTitle,
      url: `/${normalizedCountryCode}/about`,
    },
  ])

  return (
    <>
      <JsonLdScript id="about-breadcrumb-schema" data={breadcrumbSchema} />
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
          <AboutContent translations={translations} />
        </Suspense>

        <Suspense fallback={<SuspenseLoading />}>
          <StatisticsCards translations={translations} />
        </Suspense>
      </div>
    </>
  )
}
