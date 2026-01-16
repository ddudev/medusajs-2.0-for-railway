"use client"

import { useState } from "react"
import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import parse from "html-react-parser"
import { Tabs, Tab, Box, Typography } from "@mui/material"

import { HttpTypes } from "@medusajs/types"
import ProductReviews from "../product-reviews"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const [activeTab, setActiveTab] = useState(0) // Default to "Описание" (index 0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <div className="w-full bg-background-elevated border border-border-base rounded-3xl shadow-lg p-4 md:p-6">
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          mb: 0,
          "& .MuiTabs-root": {
            minHeight: "auto",
          },
          "& .MuiTab-root": {
            textTransform: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
            minHeight: "48px",
            color: "rgb(31, 41, 55)", // Text/1 - Very dark gray
            "&.Mui-selected": {
              color: "rgb(31, 41, 55)", // Text/1 - Very dark gray
            },
          },
          "& .MuiTabs-indicator": {
            display: "none",
          },
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="product information tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label="Описание"
            sx={{
              backgroundColor: activeTab === 0 ? "rgba(54, 193, 199, 0.1)" : "transparent",
              borderBottom: activeTab === 0 ? "2px solid" : "1px solid",
              borderColor: activeTab === 0 ? "rgb(54, 193, 199)" : "rgb(229, 231, 235)",
            }}
          />
          <Tab
            label="Спецификации"
            sx={{
              backgroundColor: activeTab === 1 ? "rgba(25, 118, 210, 0.1)" : "transparent",
              borderBottom: activeTab === 1 ? "2px solid" : "1px solid",
              borderColor: activeTab === 1 ? "rgb(25, 118, 210)" : "rgb(229, 231, 235)",
            }}
          />
          <Tab
            label="За изтегляне"
            sx={{
              backgroundColor: activeTab === 2 ? "rgba(25, 118, 210, 0.1)" : "transparent",
              borderBottom: activeTab === 2 ? "2px solid" : "1px solid",
              borderColor: activeTab === 2 ? "rgb(25, 118, 210)" : "rgb(229, 231, 235)",
            }}
          />
          <Tab
            label="Безопасност"
            sx={{
              backgroundColor: activeTab === 3 ? "rgba(25, 118, 210, 0.1)" : "transparent",
              borderBottom: activeTab === 3 ? "2px solid" : "1px solid",
              borderColor: activeTab === 3 ? "rgb(25, 118, 210)" : "rgb(229, 231, 235)",
            }}
          />
          <Tab
            label="Ревюта"
            sx={{
              backgroundColor: activeTab === 4 ? "rgba(25, 118, 210, 0.1)" : "transparent",
              borderBottom: activeTab === 4 ? "2px solid" : "1px solid",
              borderColor: activeTab === 4 ? "rgb(25, 118, 210)" : "rgb(229, 231, 235)",
            }}
          />
        </Tabs>
      </Box>
      <Box className="pt-6">
        {activeTab === 0 && <DescriptionTab product={product} />}
        {activeTab === 1 && <CharacteristicsTab product={product} />}
        {activeTab === 2 && <IncludedItemsTab product={product} />}
        {activeTab === 3 && <ShippingInfoTab />}
        {activeTab === 4 && <ProductReviews productId={product.id!} />}
      </Box>
    </div>
  )
}

const DescriptionTab = ({ product }: ProductTabsProps) => {
  if (!product.description) {
    return (
      <div className="text-base md:text-lg text-text-secondary">
        <Typography variant="body1" color="text.secondary">
          Няма налично описание.
        </Typography>
      </div>
    )
  }

  // Extract first paragraph as heading if available
  const descriptionText = product.description
  const firstParagraph = descriptionText.split(/<\/?p>/).filter(Boolean)[0] || descriptionText

  return (
    <div className="flex flex-col gap-4 text-base md:text-lg text-text-primary product-description">
      <h3 className="text-lg md:text-xl font-semibold text-primary">
        {firstParagraph.replace(/<[^>]*>/g, "").substring(0, 100)}
        {firstParagraph.length > 100 ? "..." : ""}
      </h3>
      <div className="text-text-primary">{parse(product.description)}</div>
    </div>
  )
}

const CharacteristicsTab = ({ product }: ProductTabsProps) => {
  const metadata = (product as any).metadata || {}
  const specifications = metadata.specifications_table

  if (!specifications) {
    return (
      <div className="text-base md:text-lg text-text-secondary">
        <Typography variant="body1" color="text.secondary">
          Няма налични технически характеристики.
        </Typography>
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
        <Typography variant="body1" color="text.secondary">
          Няма информация за включените в комплекта елементи.
        </Typography>
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
              Вашата пратка ще пристигне в рамките на 3-5 работни дни на избраното от вас място за
              получаване или в комфорта на вашия дом.
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
              Размерът не е съвсем подходящ? Не се притеснявайте - ще заменим вашия продукт с нов.
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
              Просто върнете продукта и ще възстановим парите ви. Без въпроси - ще направим всичко
              възможно, за да гарантираме, че връщането ви е безпроблемно.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
