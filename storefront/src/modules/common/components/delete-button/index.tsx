"use client"

import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useRemoveLineItem } from "@lib/hooks/use-cart"
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
  const removeLineItem = useRemoveLineItem()

  const handleDelete = () => {
    // Use TanStack Query mutation with optimistic updates
    removeLineItem.mutate(id)
  }

  const isDeleting = removeLineItem.isPending

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className
      )}
    >
      <button
        className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <Spinner className="h-4 w-4 animate-spin" />
          </span>
        ) : (
          <Trash />
        )}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton
