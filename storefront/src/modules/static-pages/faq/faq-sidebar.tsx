"use client"

import React from "react"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { clx } from "@medusajs/ui"
import {
  FileText,
  Tag,
  RefreshCw,
  CreditCard,
  Truck,
  User,
} from "lucide-react"

type FAQCategory = {
  id: string
  name: {
    en: string
    bg: string
  }
  icon: string
}

type FAQSidebarProps = {
  categories: FAQCategory[]
  activeCategoryId: string
  onCategoryChange: (categoryId: string) => void
}

const iconMap: Record<string, React.ReactNode> = {
  document: <FileText className="w-5 h-5" />,
  tag: <Tag className="w-5 h-5" />,
  return: <RefreshCw className="w-5 h-5" />,
  card: <CreditCard className="w-5 h-5" />,
  truck: <Truck className="w-5 h-5" />,
  user: <User className="w-5 h-5" />,
}

export default function FAQSidebar({
  categories,
  activeCategoryId,
  onCategoryChange,
}: FAQSidebarProps) {
  const { locale } = useTranslation()

  return (
    <div className="w-full md:w-64 flex-shrink-0">
      <nav className="flex flex-col gap-2">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId
          const categoryName =
            locale === "bg" ? category.name.bg : category.name.en

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={clx(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "bg-background-elevated text-text-primary hover:bg-background-hover"
              )}
            >
              <span className="flex-shrink-0">
                {iconMap[category.icon] || <FileText className="w-5 h-5" />}
              </span>
              <span className="font-medium">{categoryName}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
