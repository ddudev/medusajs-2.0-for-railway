import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { getProductUrl } from "@lib/seo/utils"
import { listRegions } from "@lib/data/regions"
import { getProductsList } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"

const STATIC_PATHS = [
  "about",
  "contact",
  "faq",
  "privacy",
  "gdpr",
  "assistance",
  "delivery",
  "terms",
  "careers",
  "stores",
  "brands",
]

const PRODUCT_SITEMAP_LIMIT = 1000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL()
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  const regions = await listRegions()
  if (!regions?.length) {
    return entries
  }

  const countryCodes = regions
    .flatMap((r) => r.countries?.map((c) => c.iso_2).filter(Boolean) ?? [])
    .filter((code): code is string => Boolean(code))
  const uniqueCountryCodes = [...new Set(countryCodes.map((c) => c.toLowerCase()))]

  for (const countryCode of uniqueCountryCodes) {
    const prefix = `/${countryCode}`

    entries.push({
      url: `${baseUrl}${prefix}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    })

    entries.push({
      url: `${baseUrl}${prefix}/store`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    })

    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${baseUrl}${prefix}/${path}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      })
    }
  }

  const [productCategories, collectionsResult] = await Promise.all([
    listCategories(),
    getCollectionsList(0, 500),
  ])

  const categoryHandles =
    productCategories
      ?.map((cat: { handle?: string }) => cat.handle)
      .filter((h): h is string => Boolean(h)) ?? []
  const collections = collectionsResult?.collections ?? []

  for (const countryCode of uniqueCountryCodes) {
    const prefix = `/${countryCode}`

    for (const handle of categoryHandles) {
      entries.push({
        url: `${baseUrl}${prefix}/categories/${handle}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }

    for (const coll of collections) {
      if (coll.handle) {
        entries.push({
          url: `${baseUrl}${prefix}/collections/${coll.handle}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        })
      }
    }
  }

  const productLimit = 100
  for (const countryCode of uniqueCountryCodes) {
    let pageParam = 1
    let hasMore = true
    let totalProducts = 0
    while (hasMore && totalProducts < PRODUCT_SITEMAP_LIMIT) {
      const { response, nextPage } = await getProductsList({
        countryCode,
        pageParam,
        queryParams: { limit: productLimit },
      })
      const products = response?.products ?? []
      for (const product of products) {
        if (product.handle) {
          entries.push({
            url: getProductUrl(product.handle, countryCode),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8,
          })
        }
      }
      totalProducts += products.length
      hasMore = nextPage != null && products.length === productLimit
      if (nextPage != null) pageParam = nextPage
    }
  }

  return entries
}
