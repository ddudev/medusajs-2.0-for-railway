"use client"

import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Table, clx } from "@medusajs/ui"

import { ItemPreview } from "@modules/cart/components/item/item-preview"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  items?: HttpTypes.StoreCartLineItem[]
}

const ItemsPreviewTemplate = ({ items }: ItemsTemplateProps) => {
  const hasOverflow = items && items.length > 4

  return (
    <div
      className={clx({
        "pl-[1px] overflow-y-scroll overflow-x-hidden no-scrollbar max-h-[420px]":
          hasOverflow,
      })}
      data-testid="items-table"
    >
      {items ? (
        [...items]
          .toSorted((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
          .map((item) => <ItemPreview key={item.id} item={item} />)
      ) : (
        <Table>
          <Table.Body>
            {repeat(5).map((i) => (
              <SkeletonLineItem key={i} />
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

export default ItemsPreviewTemplate
