import { Metadata } from "next"
import { getTranslation, getTranslations } from "@lib/i18n/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const resolvedParams = await params
  const translations = await getTranslations(resolvedParams.countryCode.toLowerCase())
  
  return {
    title: getTranslation(translations, "footer.careersWithUs") || "Careers",
  }
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const resolvedParams = await params
  const translations = await getTranslations(resolvedParams.countryCode.toLowerCase())
  
  return (
    <div className="content-container py-12">
      <h1 className="text-3xl font-bold mb-6">
        {getTranslation(translations, "footer.careersWithUs") || "Careers with us"}
      </h1>
      <p className="text-text-secondary">
        {getTranslation(translations, "pages.careers.comingSoon") || "This page is coming soon."}
      </p>
    </div>
  )
}
