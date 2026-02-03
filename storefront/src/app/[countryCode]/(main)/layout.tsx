import { Metadata } from "next"
import { Suspense } from "react"

import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import { getBaseURL } from "@lib/util/env"
import { QueryProvider } from "@lib/query/provider"
import { ToastContainer } from "@modules/common/components/toast-container"
import TopLoadingBar from "@modules/common/components/top-loading-bar"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  // Await params in Next.js 16
  const resolvedParams = await props.params
  
  // Validate params
  const countryCode = resolvedParams?.countryCode && typeof resolvedParams.countryCode === 'string' 
    ? resolvedParams.countryCode.toLowerCase() 
    : 'us' // Fallback to 'us' if countryCode is missing

  // Flex column + content slot with min-height so it never collapses (no flash of empty / header-footer stitch)
  // Nav includes CartButton which accesses cookies - wrap in Suspense
  return (
    <QueryProvider>
      <div className="flex min-h-screen flex-col">
        <Suspense fallback={<TopLoadingBar />}>
          <Nav countryCode={countryCode} />
        </Suspense>
        <div className="min-h-[100vh] flex-1">
          {props.children}
        </div>
        <Footer countryCode={countryCode} />
        <ToastContainer />
      </div>
    </QueryProvider>
  )
}
