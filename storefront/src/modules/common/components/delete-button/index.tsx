"use client"

import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { HttpTypes } from "@medusajs/types"

const DeleteButton = ({
  id,
  children,
  className,
  item, // Optional: pass item for tracking
}: {
  id: string
  children?: React.ReactNode
  className?: string
  item?: HttpTypes.StoreCartLineItem
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const { trackProductRemovedFromCart } = useAnalytics()

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    
    try {
      // Track removal before deleting
      if (item) {
        const price = item.unit_price ? Number(item.unit_price) / 100 : 0
        const currency = item.currency_code || 'EUR'
        
        trackProductRemovedFromCart({
          product_id: item.product_id || item.variant?.product_id || '',
          product_name: item.product_title || item.variant?.product?.title || '',
          variant_id: item.variant_id || '',
          variant_name: item.variant?.title,
          quantity: item.quantity,
          currency: currency,
          cart_value: 0, // Will be updated after cart refresh
        })
      }
      
      await deleteLineItem(id)
      // Success - cart will be refreshed by parent component via revalidation
    } catch (err: any) {
      console.error("Failed to delete line item:", err)
      // Show error to user (you might want to add a toast notification here)
      alert(err.message || "Failed to remove item from cart. Please try again.")
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className
      )}
    >
      <button
        className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
        onClick={() => handleDelete(id)}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton
