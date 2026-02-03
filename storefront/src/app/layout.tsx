import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import "styles/globals.css"
import { ThemeProvider } from "next-themes"
import TopLoadingBar from "@modules/common/components/top-loading-bar"
import { PWAComponents } from "./pwa-components"
import { PostHogProviderWrapper } from "@lib/analytics/posthog-provider"
import { PostHogSurveys } from "@lib/analytics/posthog-surveys"
import { WebVitalsTracker } from "@lib/analytics/web-vitals-tracker"
import { ScrollDepthTracker } from "@lib/analytics/scroll-depth-tracker"
import { GTMProvider } from "@lib/analytics/gtm-provider"
import { MetaPixelProvider } from "@lib/analytics/meta-pixel-provider"

const inter = Inter({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
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
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        {/* Resource hints for faster connections */}
        {backendHost && (
          <>
            <link rel="preconnect" href={backendHost} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={backendHost} />
          </>
        )}
        {/* Preconnect to common CDNs */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for image CDNs */}
        <link rel="dns-prefetch" href="https://medusa-public-images.s3.eu-west-1.amazonaws.com" />
        <link rel="dns-prefetch" href="https://bucket-production-a1ba.up.railway.app" />
        {process.env.NEXT_PUBLIC_MINIO_ENDPOINT && (
          <link rel="dns-prefetch" href={`https://${process.env.NEXT_PUBLIC_MINIO_ENDPOINT}`} />
        )}
      </head>
      <body>
        <GTMProvider>
          <MetaPixelProvider>
            <PostHogProviderWrapper>
              <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
                <main className="relative">
                  <Suspense fallback={<TopLoadingBar />}>
                    {props.children}
                  </Suspense>
                </main>
                <Suspense fallback={null}>
                  <PWAComponents />
                </Suspense>
                <PostHogSurveys />
                <WebVitalsTracker />
                <ScrollDepthTracker />
              </ThemeProvider>
            </PostHogProviderWrapper>
          </MetaPixelProvider>
        </GTMProvider>
      </body>
    </html>
  )
}
