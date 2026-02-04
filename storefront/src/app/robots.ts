import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { listRegions } from "@lib/data/regions"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = getBaseURL()
  const regions = await listRegions()

  const disallowPaths: string[] = []
  if (regions?.length) {
    const countryCodes = regions
      .flatMap((r) => r.countries?.map((c) => c.iso_2).filter(Boolean) ?? [])
      .filter((code): code is string => Boolean(code))
    const uniqueCodes = [...new Set(countryCodes.map((c) => c?.toLowerCase()))]
    uniqueCodes.forEach((countryCode) => {
      disallowPaths.push(`/${countryCode}/checkout`)
      disallowPaths.push(`/${countryCode}/account`)
    })
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        ...(disallowPaths.length > 0 ? { disallow: disallowPaths } : {}),
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
