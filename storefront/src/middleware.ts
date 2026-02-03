import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
// Trim to avoid 400 from backend when .env has trailing newline/space
const PUBLISHABLE_API_KEY = (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "").trim()
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
  /** After a 400 (invalid publishable key), skip refetch for this long to avoid log spam */
  lastFailureAt: 0 as number,
  lastFailureLoggedAt: 0 as number,
}

async function getRegionMap() {
  const { regionMap, regionMapUpdated } = regionMapCache

  const now = Date.now()
  const backoffMs = 60 * 1000 // After 400, don't refetch for 60s
  const isInBackoff = regionMapCache.lastFailureAt > 0 && now - regionMapCache.lastFailureAt < backoffMs

  if (
    (!regionMap.keys().next().value || regionMapUpdated < now - 3600 * 1000) &&
    !isInBackoff
  ) {
    // Fetch regions from Medusa. We can't use the JS client here because middleware is running on Edge and the client needs a Node environment.
    const regionsUrl = `${BACKEND_URL}/store/regions`
    if (process.env.NODE_ENV === "development") {
      console.debug("[middleware] getRegionMap: fetching", {
        url: regionsUrl,
        hasBackendUrl: !!BACKEND_URL,
        hasPublishableKey: !!PUBLISHABLE_API_KEY,
        keyLength: PUBLISHABLE_API_KEY.length,
      })
    }

    let regions: HttpTypes.StoreRegion[] | undefined
    try {
      const res = await fetch(regionsUrl, {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_API_KEY,
        },
        // Edge middleware: next.revalidate/tags are for Node fetch only; omit or use cache
        cache: "force-cache",
      })

      if (process.env.NODE_ENV === "development") {
        console.debug("[middleware] getRegionMap: response", {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
        })
      }

      if (!res.ok) {
        const text = await res.text()
        regionMapCache.lastFailureAt = now
        // Log at most once per 60s to avoid terminal spam
        if (now - regionMapCache.lastFailureLoggedAt >= backoffMs) {
          regionMapCache.lastFailureLoggedAt = now
          console.error("[middleware] getRegionMap: backend rejected request (400 = publishable key invalid)", {
            status: res.status,
            body: text.slice(0, 300),
            hint: "Ensure NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in storefront .env matches a key in Medusa Admin → Settings → Publishable API Keys. No spaces/newlines.",
          })
        }
        return regionMapCache.regionMap
      }
      // Success: clear failure backoff
      regionMapCache.lastFailureAt = 0

      const data = await res.json().catch((parseError) => {
        console.error("[middleware] getRegionMap: JSON parse error", parseError)
        return null
      })
      regions = data?.regions
    } catch (fetchError) {
      console.error("[middleware] getRegionMap: fetch failed", {
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        url: regionsUrl,
      })
      return regionMapCache.regionMap
    }

    if (!regions?.length) {
      console.error("debug: no regions found + regions", regions)
      if (process.env.NODE_ENV === "development") {
        console.error(
          "Middleware: No regions found. Did you set up regions in your Medusa Admin?"
        )
      }
      // Return empty map - getCountryCode will handle fallback logic
      return regionMapCache.regionMap
    }

    // Create a map of country codes to regions.
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = request.headers
      .get("x-vercel-ip-country")
      ?.toLowerCase()

    const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Middleware.ts: Error getting the country code. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable?"
      )
    }
  }
}

/**
 * Middleware to handle region selection and onboarding status.
 */
export async function middleware(request: NextRequest) {
  // Skip middleware for service worker and PWA files
  if (
    request.nextUrl.pathname === '/sw.js' ||
    request.nextUrl.pathname === '/manifest.json' ||
    request.nextUrl.pathname.startsWith('/icon-') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  const searchParams = request.nextUrl.searchParams
  const isOnboarding = searchParams.get("onboarding") === "true"
  const cartId = searchParams.get("cart_id")
  const checkoutStep = searchParams.get("step")
  const onboardingCookie = request.cookies.get("_medusa_onboarding")
  const cartIdCookie = request.cookies.get("_medusa_cart_id")

  const regionMap = await getRegionMap()

  const countryCode = regionMap && (await getCountryCode(request, regionMap))

  const urlHasCountryCode =
    countryCode && request.nextUrl.pathname.split("/")[1].includes(countryCode)

  // check if one of the country codes is in the url
  if (
    urlHasCountryCode &&
    (!isOnboarding || onboardingCookie) &&
    (!cartId || cartIdCookie)
  ) {
    return NextResponse.next()
  }

  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname

  const queryString = request.nextUrl.search ? request.nextUrl.search : ""

  let redirectUrl = request.nextUrl.href

  let response = NextResponse.redirect(redirectUrl, 307)

  // If no country code is set, we redirect to the relevant region.
  if (!urlHasCountryCode && countryCode) {
    redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
  }

  // If a cart_id is in the params, we set it as a cookie and redirect to the address step.
  if (cartId && !checkoutStep) {
    redirectUrl = `${redirectUrl}&step=address`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
    response.cookies.set("_medusa_cart_id", cartId, { maxAge: 60 * 60 * 24 })
  }

  // Set a cookie to indicate that we're onboarding. This is used to show the onboarding flow.
  if (isOnboarding) {
    response.cookies.set("_medusa_onboarding", "true", { maxAge: 60 * 60 * 24 })
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-.*\\.png|.*\\.png|.*\\.jpg|.*\\.gif|.*\\.svg).*)"], // prevents redirecting on static files, PWA files, and image optimization
}
