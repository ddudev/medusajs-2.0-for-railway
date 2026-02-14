import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { connection } from "next/server"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { getCollectionsList } from "@lib/data/collections"
import { StoreProductCategory, StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { generateCategorySchema } from "@lib/seo/category-schema"
import { generateCategoryBreadcrumb } from "@lib/seo/breadcrumb-schema"
import { generateHreflangMetadata } from "@lib/seo/hreflang"
import { getCanonicalUrl } from "@lib/seo/utils"
import { stripHtml, htmlToMetaDescription } from "@lib/util/strip-html"
import { getTranslations, getTranslation } from "@lib/i18n/server"
import JsonLdScript from "components/seo/json-ld-script"
import SuspenseLoading from "@modules/common/components/suspense-loading"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

// MIGRATED: Removed export const revalidate = 3600 (incompatible with Cache Components)
// MIGRATED: Removed export const dynamicParams = false (incompatible with Cache Components)
// TODO: Will add generateStaticParams and "use cache" + cacheLife() after analyzing build errors

export async function generateStaticParams() {
  const product_categories = await listCategories()

  if (!product_categories) {
    return []
  }

  const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
    regions
      ?.map((r) => r.countries?.map((c) => c.iso_2))
      .flat()
      .filter((code): code is string => Boolean(code)) // Filter out undefined values
  )

  const categoryHandles = product_categories
    .map((category: any) => category.handle)
    .filter((handle): handle is string => Boolean(handle)) // Filter out undefined handles

  if (!countryCodes || countryCodes.length === 0 || categoryHandles.length === 0) {
    return []
  }

  const staticParams = countryCodes
    .map((countryCode: string) =>
      categoryHandles.map((handle: string) => ({
        countryCode,
        category: [handle],
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache"
  const resolvedParams = await params

  try {
    const normalizedCountryCode = typeof resolvedParams.countryCode === "string"
      ? resolvedParams.countryCode.toLowerCase()
      : "us"
    const translations = await getTranslations(normalizedCountryCode)
    const siteName = getTranslation(translations, "metadata.siteName")
    
    if (!resolvedParams.category?.length) {
      const fallbackTitle = getTranslation(translations, "metadata.category.fallbackTitle")
      const fallbackDescription = getTranslation(translations, "metadata.category.fallbackDescription")
      return {
        title: `${fallbackTitle} | ${siteName}`,
        description: fallbackDescription,
      }
    }

    const decodedSegments = resolvedParams.category.map((s) => decodeURIComponent(s.trim()))
    const result = await getCategoryByHandle(decodedSegments)
    const product_categories = result?.product_categories ?? []

    if (!product_categories.length) {
      const fallbackTitle = getTranslation(translations, "metadata.category.fallbackTitle")
      const fallbackDescription = getTranslation(translations, "metadata.category.fallbackDescription")
      return {
        title: `${fallbackTitle} | ${siteName}`,
        description: fallbackDescription,
      }
    }

    const fallbackCategoryTitle = getTranslation(translations, "metadata.category.fallbackTitle")
    const title = product_categories
      .map((category: StoreProductCategory) => category.name)
      .filter(Boolean)
      .join(" | ") || fallbackCategoryTitle

    const categorySuffix = getTranslation(translations, "metadata.category.categorySuffix")
    let description = stripHtml(
      product_categories[product_categories.length - 1]?.description
    ) || `${title} ${categorySuffix}.`
    
    if (!description || description.length < 120) {
      const shopProductsTemplate = getTranslation(translations, "metadata.category.shopProducts")
      description = shopProductsTemplate
        .replace("{title}", title)
        .replace("{titleLower}", title.toLowerCase())
    }
    
    description = htmlToMetaDescription(description, 160)

    const categoryPath = `/categories/${resolvedParams.category.filter(Boolean).join("/")}`
    const categoryUrl = getCanonicalUrl(categoryPath, normalizedCountryCode)
    const hreflangAlternates = await generateHreflangMetadata(
      categoryPath,
      normalizedCountryCode
    )

    return {
      title: `${title} | ${siteName}`,
      description,
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      alternates: {
        canonical: categoryUrl,
        languages: hreflangAlternates,
      },
      openGraph: {
        title: `${title} | ${siteName}`,
        description,
        type: "website",
        url: categoryUrl,
        siteName: siteName,
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteName}`,
        description,
        site: "@msstore", // Add Twitter handle (update with actual handle)
        creator: "@msstore", // Add Twitter creator (update with actual handle)
      },
    }
  } catch (error) {
    const normalizedCountryCode = typeof resolvedParams?.countryCode === 'string' 
      ? resolvedParams.countryCode.toLowerCase() 
      : 'us'
    const translations = await getTranslations(normalizedCountryCode)
    const siteName = getTranslation(translations, "metadata.siteName")
    const fallbackTitle = getTranslation(translations, "metadata.category.fallbackTitle")
    const fallbackDescription = getTranslation(translations, "metadata.category.fallbackDescription")
    return {
      title: `${fallbackTitle} | ${siteName}`,
      description: fallbackDescription,
    }
  }
}

async function CategoryPageContent({ params, searchParams }: Props) {
  await connection()
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const { sortBy, page } = resolvedSearchParams

  if (!resolvedParams.countryCode || !resolvedParams.category?.length) {
    notFound()
  }

  const normalizedCountryCode = typeof resolvedParams.countryCode === "string"
    ? resolvedParams.countryCode.toLowerCase()
    : "us"

  const decodedSegments = resolvedParams.category.map((s) => decodeURIComponent(s.trim()))
  const result = await getCategoryByHandle(decodedSegments)
  const product_categories = result?.product_categories ?? []

  if (!product_categories.length) {
    notFound()
  }

  const { collections } = await getCollectionsList(0, 100)
  const categoryPath = `/categories/${resolvedParams.category.filter(Boolean).join("/")}`
  const categoryUrl = getCanonicalUrl(categoryPath, normalizedCountryCode)

  const categorySchema = generateCategorySchema({
    categories: product_categories,
    countryCode: normalizedCountryCode,
    categoryUrl,
  })

  const breadcrumbSchema = generateCategoryBreadcrumb(
    product_categories.map((cat: StoreProductCategory) => ({
      name: cat.name || "",
      handle: cat.handle || "",
    })),
    normalizedCountryCode
  )

  return (
    <>
      <JsonLdScript id="category-schema" data={categorySchema} />
      <JsonLdScript id="breadcrumb-schema" data={breadcrumbSchema} />
      <Suspense fallback={<SuspenseLoading />}>
        <CategoryTemplate
          categories={product_categories}
          collections={collections || []}
          sortBy={sortBy}
          page={page}
          countryCode={normalizedCountryCode}
        />
      </Suspense>
    </>
  )
}

export default async function CategoryPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<SuspenseLoading />}>
      <CategoryPageContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}
