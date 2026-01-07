"use client"

import React from "react"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { clx } from "@medusajs/ui"
import {
  Description as DocumentIcon,
  LocalOffer as TagIcon,
  Refresh as ReturnIcon,
  CreditCard as CardIcon,
  LocalShipping as TruckIcon,
  Person as UserIcon,
} from "@mui/icons-material"

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
  document: <DocumentIcon className="w-5 h-5" />,
  tag: <TagIcon className="w-5 h-5" />,
  return: <ReturnIcon className="w-5 h-5" />,
  card: <CardIcon className="w-5 h-5" />,
  truck: <TruckIcon className="w-5 h-5" />,
  user: <UserIcon className="w-5 h-5" />,
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
                {iconMap[category.icon] || <DocumentIcon className="w-5 h-5" />}
              </span>
              <span className="font-medium">{categoryName}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
