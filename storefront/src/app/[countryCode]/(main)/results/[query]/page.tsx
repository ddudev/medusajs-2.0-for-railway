import { Metadata } from "next"

import SearchResultsTemplate from "@modules/search/templates/search-results-template"

import { search } from "@modules/search/actions"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getCanonicalUrl } from "@lib/seo/utils"
import { getTranslations, getTranslation } from "@lib/i18n/server"

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolvedParams = await params
  const { query, countryCode } = resolvedParams
  
  const normalizedCountryCode = typeof countryCode === 'string' 
    ? countryCode.toLowerCase() 
    : 'us'
  
  // Get translations for metadata
  const translations = await getTranslations(normalizedCountryCode)
  const siteName = getTranslation(translations, "metadata.siteName")
  const searchForQuery = getTranslation(translations, "metadata.search.forQuery")
  const findProducts = getTranslation(translations, "metadata.search.findProducts")
  
  const title = `${searchForQuery.replace("{query}", query)} | ${siteName}`
  const description = findProducts.replace("{query}", query)
  const canonicalUrl = getCanonicalUrl(
    `/results/${encodeURIComponent(query)}`,
    normalizedCountryCode
  )

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: siteName || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

// Enable ISR with 1 hour revalidation for search results
// MIGRATED: Removed export const revalidate = 3600 (incompatible with Cache Components)
// TODO: Will add "use cache" + cacheLife() or <Suspense> after analyzing build errors

type Params = {
  params: Promise<{ query: string; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

export default async function SearchResults({ params, searchParams }: Params) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const { query, countryCode } = resolvedParams
  const { sortBy, page } = resolvedSearchParams

  const hits = await search(query).then((data) => data)

  const ids = hits
    .map((h) => h.objectID || h.id)
    .filter((id): id is string => {
      return typeof id === "string"
    })

  return (
    <SearchResultsTemplate
      query={query}
      ids={ids}
      sortBy={sortBy}
      page={page}
      countryCode={countryCode}
    />
  )
}
