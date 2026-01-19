import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import {
  getCollectionByHandle,
  getCollectionsList,
} from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { stripHtml, htmlToMetaDescription } from "@lib/util/strip-html"
import { getTranslations, getTranslation } from "@lib/i18n/server"
import SuspenseLoading from "@modules/common/components/suspense-loading"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: {
    page?: string
    sortBy?: SortOptions
  }
}

export const PRODUCT_LIMIT = 12

// MIGRATED: Removed export const revalidate = 3600 (incompatible with Cache Components)
// MIGRATED: Removed export const dynamicParams = false (incompatible with Cache Components)
// TODO: Will add generateStaticParams and "use cache" + cacheLife() after analyzing build errors

export async function generateStaticParams() {
  // Next.js 16 Cache Components requires at least one result
  const defaultCountryCode = 'bg' // Default for this store
  
  try {
    const { collections } = await getCollectionsList()

    const countryCodes = await listRegions().then(
      (regions: StoreRegion[]) =>
        regions
          ?.map((r) => r.countries?.map((c) => c.iso_2))
          .flat()
          .filter(Boolean) as string[]
    ) || [defaultCountryCode]

    // Ensure we have at least one country code
    const validCountryCodes = countryCodes.length > 0 ? countryCodes : [defaultCountryCode]

    // If no collections, return at least one placeholder to satisfy Next.js 16 requirement
    if (!collections || collections.length === 0) {
      return [{
        countryCode: defaultCountryCode,
        handle: 'placeholder', // This will trigger notFound() in the page component
      }]
    }

    const collectionHandles = collections
      .map((collection: StoreCollection) => collection.handle)
      .filter((handle): handle is string => Boolean(handle)) // Filter out undefined handles

    // Ensure we have at least one handle
    if (collectionHandles.length === 0) {
      return [{
        countryCode: defaultCountryCode,
        handle: 'placeholder',
      }]
    }

    const staticParams = validCountryCodes
      .map((countryCode: string) =>
        collectionHandles.map((handle: string) => ({
          countryCode,
          handle,
        }))
      )
      .flat()

    // Ensure we return at least one result
    return staticParams.length > 0 ? staticParams : [{
      countryCode: defaultCountryCode,
      handle: 'placeholder',
    }]
  } catch (error) {
    // If anything fails, return at least one placeholder
    console.warn('Error generating static params for collections:', error)
    return [{
      countryCode: defaultCountryCode,
      handle: 'placeholder',
    }]
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await params in Next.js 16
  const resolvedParams = await params
  const collection = await getCollectionByHandle(resolvedParams.handle)

  if (!collection) {
    notFound()
  }

  const normalizedCountryCode = typeof resolvedParams.countryCode === 'string' 
    ? resolvedParams.countryCode.toLowerCase() 
    : 'us'
  
  // Get translations for metadata
  const translations = await getTranslations(normalizedCountryCode)
  const siteName = getTranslation(translations, "metadata.siteName")

  // Generate meaningful description - strip HTML if present
  const fallbackCollectionTitle = getTranslation(translations, "metadata.collection.fallbackTitle")
  let description = stripHtml(
    collection.metadata?.description as string
  ) || collection.title || fallbackCollectionTitle
  
  // Ensure description is meaningful and SEO-friendly
  if (!description || description.length < 50) {
    const collectionTemplate = getTranslation(translations, "metadata.collection.fallbackDescription")
    description = collectionTemplate.replace("{title}", collection.title)
  }
  
  // Ensure description is optimal length (max 160 characters)
  description = htmlToMetaDescription(description, 160)

  return {
    title: `${collection.title} | ${siteName}`,
    description,
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function CollectionPage({ params, searchParams }: Props) {
  // Await params in Next.js 16
  const resolvedParams = await params
  const { sortBy, page } = searchParams

  const collection = await getCollectionByHandle(resolvedParams.handle).then(
    (collection: StoreCollection) => collection
  )

  if (!collection) {
    notFound()
  }

  return (
    <Suspense fallback={<SuspenseLoading />}>
      <CollectionTemplate
        collection={collection}
        page={page}
        sortBy={sortBy}
        countryCode={resolvedParams.countryCode}
      />
    </Suspense>
  )
}
