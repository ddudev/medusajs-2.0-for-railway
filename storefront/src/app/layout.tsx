import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import "styles/globals.css"
import { ThemeProvider } from "next-themes"
import TopLoadingBar from "@modules/common/components/top-loading-bar"
import { DeferredAnalyticsWrapper } from "@lib/analytics/deferred-analytics-wrapper"
import { PostHogIdentifyOnLogin } from "@lib/analytics/posthog-identify-on-login"
import { FirstTouchOriginCapture } from "@modules/common/components/first-touch-origin-capture"
import { PWAComponents } from "./pwa-components"
import { retrieveCart } from "@lib/data/cart"
import { getCustomer } from "@lib/data/customer"
import {
  CookieConsentProvider,
  CookieSettings,
} from "@/components/cookie-consent"
import { BottomBannersStack } from "@/components/bottom-banners-stack"

// Fewer weights = smaller font payload and faster LCP (300/500 dropped; 400/600/700 cover normal/semibold/bold)
const inter = Inter({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

const siteName =
  process.env.NEXT_PUBLIC_SITE_NAME || "MS Store"
const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  "Shop online with fast delivery and secure checkout."

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  openGraph: {
    title: siteName,
    description: siteDescription,
  },
}

/** Fetches customer + cart inside Suspense so layout does not block navigation. */
async function AnalyticsIdentity() {
  const customer = await getCustomer().catch(() => null)
  const cart = await retrieveCart().catch(() => null)
  return <PostHogIdentifyOnLogin customer={customer} cart={cart} />
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""
  const backendHost = backendUrl ? new URL(backendUrl).origin : ""

  return (
    <html lang="en" data-mode="light" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Prevent CSS caching in development to fix HMR issues */}
        {process.env.NODE_ENV === 'development' && (
          <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        )}
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#519717" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MS Store" />
        <link rel="apple-touch-icon" href="/icon512_rounded.png" />
        {/* Resource hints: preconnect only to critical origins (Lighthouse: use sparingly) */}
        {backendHost && (
          <>
            <link rel="preconnect" href={backendHost} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={backendHost} />
          </>
        )}
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* DNS prefetch for image CDNs */}
        <link rel="dns-prefetch" href="https://medusa-public-images.s3.eu-west-1.amazonaws.com" />
        <link rel="dns-prefetch" href="https://bucket-production-a1ba.up.railway.app" />
        {process.env.NEXT_PUBLIC_MINIO_ENDPOINT && (
          <link rel="dns-prefetch" href={`https://${process.env.NEXT_PUBLIC_MINIO_ENDPOINT}`} />
        )}
      </head>
      <body>
        <CookieConsentProvider
          config={{
            consentVersion: "1.0.0",
            privacyPolicyUrl: "/privacy",
            googleConsentMode: { enabled: true },
          }}
        >
          <DeferredAnalyticsWrapper>
            <Suspense fallback={null}>
              <AnalyticsIdentity />
            </Suspense>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
              <main className="relative">
                <Suspense fallback={<TopLoadingBar />}>
                  {props.children}
                </Suspense>
              </main>
              <Suspense fallback={null}>
                <FirstTouchOriginCapture />
                <PWAComponents />
              </Suspense>
            </ThemeProvider>
          </DeferredAnalyticsWrapper>
          <Suspense fallback={null}>
            <BottomBannersStack />
          </Suspense>
          <CookieSettings />
        </CookieConsentProvider>
      </body>
    </html>
  )
}
