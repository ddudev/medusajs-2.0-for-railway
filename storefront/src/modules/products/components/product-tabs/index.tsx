"use client"

import { useState } from "react"
import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import parse from "html-react-parser"
import { HttpTypes } from "@medusajs/types"
import ProductReviews from "../product-reviews"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const TAB_LABELS = ["Описание", "Спецификации", "За изтегляне", "Безопасност", "Ревюта"]

const ProductTabs = ({ product }: ProductTabsProps) => {
  const [activeTab, setActiveTab] = useState(0) // Default to "Описание" (index 0)

  const handleTabClick = (index: number) => {
    setActiveTab(index)
  }

  return (
    <div className="w-full bg-background-elevated border border-border-base rounded-3xl shadow-lg overflow-hidden">
      {/* Tabs header */}
      <div
        className="border-b border-border-base mb-0 overflow-x-auto"
        role="tablist"
        aria-label="product information tabs"
      >
        <div className="flex min-w-max">
          {TAB_LABELS.map((label, index) => {
            const isActive = activeTab === index

            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabClick(index)}
                className={[
                  "px-5 lg:px-6 py-4 text-base font-semibold whitespace-nowrap border-b transition-colors",
                  "text-text-primary lg:min-w-48 lg:text-lg",
                  isActive
                    ? "bg-primary/5 border-primary"
                    : "bg-transparent border-border-base hover:bg-background-elevated",
                ].join(" ")}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab panels */}
      <div className="px-4 py-4 md:px-12 md:py-8">
        {activeTab === 0 && <DescriptionTab product={product} />}
        {activeTab === 1 && <CharacteristicsTab product={product} />}
        {activeTab === 2 && <IncludedItemsTab product={product} />}
        {activeTab === 3 && <ShippingInfoTab />}
        {activeTab === 4 && <ProductReviews productId={product.id!} />}
      </div>
    </div>
  )
}

const DescriptionTab = ({ product }: ProductTabsProps) => {
  if (!product.description) {
    return (
      <div className="text-base md:text-lg text-text-secondary">
        <p className="text-base md:text-lg text-text-secondary">
          Няма налично описание.
        </p>
      </div>
    )
  }

  // Model output sometimes contains literal \n (backslash + n); convert to <br /> for display
  const descriptionText = (product.description || "").replace(/\\n/g, "")
  const firstParagraph =
    descriptionText.split(/<\/?p>/).filter(Boolean)[0] || descriptionText

  return (
    <div className="flex flex-col gap-4 text-base md:text-lg text-text-primary product-description">
      <h3 className="text-lg md:text-xl font-semibold text-primary">
        {firstParagraph.replace(/<[^>]*>/g, "").substring(0, 100)}
        {firstParagraph.length > 100 ? "..." : ""}
      </h3>
      <div className="text-text-primary whitespace-pre-line">{parse(descriptionText)}</div>
    </div>
  )
}

const CharacteristicsTab = ({ product }: ProductTabsProps) => {
  const metadata = (product as any).metadata || {}
  const specifications = metadata.specifications_table

  if (!specifications) {
    return (
      <div className="text-base md:text-lg text-text-secondary">
        <p className="text-base md:text-lg text-text-secondary">
          Няма налични технически характеристики.
        </p>
      </div>
    )
  }

  return (
    <div className="text-base md:text-lg text-text-primary">
      {parse(specifications)}
    </div>
  )
}

const IncludedItemsTab = ({ product }: ProductTabsProps) => {
  const metadata = (product as any).metadata || {}
  const includedItems = metadata.included_items

  if (!includedItems) {
    return (
      <div className="text-base md:text-lg text-text-secondary">
        <p className="text-base md:text-lg text-text-secondary">
          Няма информация за включените в комплекта елементи.
        </p>
      </div>
    )
  }

  return (
    <div className="text-base md:text-lg text-text-primary">
      {parse(includedItems)}
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-base md:text-lg text-text-primary">
      <div className="grid grid-cols-1 gap-y-6">
        <div className="flex items-start gap-x-4">
          <div className="text-primary flex-shrink-0">
            <FastDelivery size="24" />
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-2 text-lg">
              Експресна доставка
            </span>
            <p className="text-text-secondary">
              Вашата пратка ще пристигне в рамките на 3-5 работни дни на избраното
              от вас място за получаване или в комфорта на вашия дом.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-4">
          <div className="text-primary flex-shrink-0">
            <Refresh size="24" />
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-2 text-lg">
              Лесни замени
            </span>
            <p className="text-text-secondary">
              Размерът не е съвсем подходящ? Не се притеснявайте - ще заменим
              вашия продукт с нов.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-4">
          <div className="text-primary flex-shrink-0">
            <Back size="24" />
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-2 text-lg">
              Лесни връщания
            </span>
            <p className="text-text-secondary">
              Просто върнете продукта и ще възстановим парите ви. Без въпроси -
              ще направим всичко възможно, за да гарантираме, че връщането ви е
              безпроблемно.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs