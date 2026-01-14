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
    <div className="w-full">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          aria-label="product information tabs"
        >
          <Tab label="Описание" />
          <Tab label="Характеристики" />
          <Tab label="Какво е включено" />
          <Tab label="Product Information" />
          <Tab label="Shipping & Returns" />
          <Tab label="Ревюта" />
        </Tabs>
      </Box>
      <Box>
        {activeTab === 0 && <DescriptionTab product={product} />}
        {activeTab === 1 && <CharacteristicsTab product={product} />}
        {activeTab === 2 && <IncludedItemsTab product={product} />}
        {activeTab === 3 && <ProductInfoTab product={product} />}
        {activeTab === 4 && <ShippingInfoTab />}
        {activeTab === 5 && <ProductReviews productId={product.id!} />}
      </Box>
    </div>
  )
}

const DescriptionTab = ({ product }: ProductTabsProps) => {
  if (!product.description) {
    return (
      <div className="text-base text-text-secondary py-8">
        <Typography variant="body1" color="text.secondary">
          Няма налично описание.
        </Typography>
      </div>
    )
  }

  return (
    <div className="text-base text-text-secondary py-8 product-description">
      {parse(product.description)}
    </div>
  )
}

const CharacteristicsTab = ({ product }: ProductTabsProps) => {
  const metadata = (product as any).metadata || {}
  const specifications = metadata.specifications_table

  if (!specifications) {
    return (
      <div className="text-base text-text-secondary py-8">
        <Typography variant="body1" color="text.secondary">
          Няма налични технически характеристики.
        </Typography>
      </div>
    )
  }

  return (
    <div className="text-base text-text-secondary py-8">
      {parse(specifications)}
    </div>
  )
}

const IncludedItemsTab = ({ product }: ProductTabsProps) => {
  const metadata = (product as any).metadata || {}
  const includedItems = metadata.included_items

  if (!includedItems) {
    return (
      <div className="text-base text-text-secondary py-8">
        <Typography variant="body1" color="text.secondary">
          Няма информация за включените в комплекта елементи.
        </Typography>
      </div>
    )
  }

  return (
    <div className="text-base text-text-secondary py-8">
      {parse(includedItems)}
    </div>
  )
}

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  return (
    <div className="text-base text-text-secondary py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold text-text-primary block mb-1">Material</span>
            <p className="text-text-secondary">{product.material ? product.material : "-"}</p>
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-1">Country of origin</span>
            <p className="text-text-secondary">{product.origin_country ? product.origin_country : "-"}</p>
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-1">Type</span>
            <p className="text-text-secondary">{product.type ? product.type.value : "-"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold text-text-primary block mb-1">Weight</span>
            <p className="text-text-secondary">{product.weight ? `${product.weight} g` : "-"}</p>
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-1">Dimensions</span>
            <p className="text-text-secondary">
              {product.length && product.width && product.height
                ? `${product.length}L x ${product.width}W x ${product.height}H`
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-base text-text-secondary py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-4">
          <div className="text-primary">
            <FastDelivery />
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-2">Fast delivery</span>
            <p className="max-w-sm text-text-secondary">
              Your package will arrive in 3-5 business days at your pick up
              location or in the comfort of your home.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-4">
          <div className="text-primary">
            <Refresh />
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-2">Simple exchanges</span>
            <p className="max-w-sm text-text-secondary">
              Is the fit not quite right? No worries - we&apos;ll exchange your
              product for a new one.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-4">
          <div className="text-primary">
            <Back />
          </div>
          <div>
            <span className="font-semibold text-text-primary block mb-2">Easy returns</span>
            <p className="max-w-sm text-text-secondary">
              Just return your product and we&apos;ll refund your money. No
              questions asked – we&apos;ll do our best to make sure your return
              is hassle-free.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
