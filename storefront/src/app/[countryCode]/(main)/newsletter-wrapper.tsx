'use client'

import dynamic from 'next/dynamic'

// Client Component wrapper for newsletter (ssr: false)
const NewsletterLazy = dynamic(
  () => import('@modules/home/components/newsletter'),
  {
    ssr: false,
    loading: () => (
      <div className="content-container py-8 md:py-12 min-h-[120px] animate-pulse rounded-3xl bg-background-elevated border border-border-base" aria-hidden />
    ),
  }
)

export default function NewsletterWrapper() {
  return <NewsletterLazy />
}

