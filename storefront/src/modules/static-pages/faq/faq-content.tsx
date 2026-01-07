"use client"

import React, { useState, useMemo } from "react"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import FAQSidebar from "./faq-sidebar"
import FAQAccordion from "./faq-accordion"

type FAQCategory = {
  id: string
  name: {
    en: string
    bg: string
  }
  icon: string
  questions: Array<{
    id: string
    question: {
      en: string
      bg: string
    }
    answer: {
      en: string
      bg: string
    }
  }>
}

type FAQContentProps = {
  categories: FAQCategory[]
}

export default function FAQContent({ categories }: FAQContentProps) {
  const { locale } = useTranslation()
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id || ""
  )

  const activeCategory = useMemo(() => {
    return categories.find((cat) => cat.id === activeCategoryId) || categories[0]
  }, [categories, activeCategoryId])

  if (!activeCategory) {
    return null
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      <FAQSidebar
        categories={categories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={setActiveCategoryId}
      />
      <div className="flex-1">
        <FAQAccordion questions={activeCategory.questions} locale={locale} />
      </div>
    </div>
  )
}
