"use client"

import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  items?: HttpTypes.StoreCartLineItem[]
}

const ItemsTemplate = ({ items }: ItemsTemplateProps) => {
  const { t } = useTranslation()

  return (
    <div>
      <div className="pb-6 flex items-center border-b border-gray-100 mb-4">
        <Heading level="h1" className="text-2xl md:text-3xl font-bold text-gray-900">
          {t("cart.title")}
        </Heading>
      </div>
      
      <div className="divide-y divide-gray-100">
        {items
          ? items
              .toSorted((a, b) =>
                (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
              )
              .map((item) => {
                return <Item key={item.id} item={item} />
              })
          : repeat(5).map((i) => {
              return <SkeletonLineItem key={i} />
            })}
      </div>
    </div>
  )
}

export default ItemsTemplate
