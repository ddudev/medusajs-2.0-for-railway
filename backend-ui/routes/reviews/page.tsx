import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { 
  createDataTableColumnHelper, 
  Container, 
  DataTable, 
  useDataTable, 
  Heading, 
  createDataTableCommandHelper, 
  DataTableRowSelectionState, 
  StatusBadge, 
  Toaster, 
  toast,
  DataTablePaginationState
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import React, { useMemo, useState } from "react"
import { sdk } from "../../src/lib/client"
import { HttpTypes } from "@medusajs/types"
import { Link } from "react-router-dom"

type Review = {
  id: string
  title?: string
  content: string
  rating: number
  product_id: string
  customer_id?: string
  status: "pending" | "approved" | "rejected"
  created_at: Date
  updated_at: Date
  product?: HttpTypes.AdminProduct
  customer?: HttpTypes.AdminCustomer
}


const columnHelper = createDataTableColumnHelper<Review>()

const columns = [
  columnHelper.select(),
  columnHelper.accessor("id", {
    header: "ID",
  }),
  columnHelper.accessor("title", {
    header: "Title",
  }),
  columnHelper.accessor("rating", {
    header: "Rating", 
  }),
  columnHelper.accessor("content", {
    header: "Content"
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) => {
      const color = row.original.status === "approved" ? 
        "green" : row.original.status === "rejected" 
        ? "red" : "grey"
      return (
        <StatusBadge color={color}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
          </StatusBadge>
      )
    }
  }),
  columnHelper.accessor("product", {
    header: "Product",
    cell: ({ row }) => {
      return (
        <Link
          to={`/products/${row.original.product_id}`}
        >
          {row.original.product?.title}
        </Link>
      )
    }
  }),
]

const commandHelper = createDataTableCommandHelper()

const useCommands = (refetch: () => void) => {
  return [
    commandHelper.command({
      label: "Approve",
      shortcut: "A",
      action: async (selection) => {
        const reviewsToApproveIds = Object.keys(selection)

        sdk.client.fetch("/admin/reviews/status", {
          method: "POST",
          body: JSON.stringify({
            ids: reviewsToApproveIds,
            status: "approved"
          })
        }).then(() => {
          toast.success("Reviews approved")
          refetch()
        }).catch(() => {
          toast.error("Failed to approve reviews")
        })
      }
    }),
    commandHelper.command({
      label: "Reject",
      shortcut: "R",
      action: async (selection) => {
        const reviewsToRejectIds = Object.keys(selection)

        sdk.client.fetch("/admin/reviews/status", {
          method: "POST",
          body: JSON.stringify({
            ids: reviewsToRejectIds,
            status: "rejected"
          })
        }).then(() => {
          toast.success("Reviews rejected")
          refetch()
        }).catch(() => {
          toast.error("Failed to reject reviews")
        })
      }
    })
  ]
}


const limit = 15

const ReviewsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0
  })
  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})

  const offset = useMemo(() => {
    return pagination.pageIndex * limit
  }, [pagination])

  const { data, isLoading, refetch, isError, error } = useQuery<{
    reviews: Review[]
    count: number
    limit: number
    offset: number
  }>({
    queryKey: ["reviews", offset, limit],
    queryFn: async () => {
      try {
        const response = await sdk.client.fetch<{
          reviews: Review[]
          count: number
          limit: number
          offset: number
        }>("/admin/reviews", {
          method: "GET",
          query: {
            offset: pagination.pageIndex * pagination.pageSize,
            limit: pagination.pageSize,
            order: "-created_at"
          }
        })
        return response
      } catch (err) {
        console.error("Error fetching reviews:", err)
        throw err
      }
    }
  })

  const commands = useCommands(refetch)

  const table = useDataTable({
    columns,
    data: data?.reviews || [],
    rowCount: data?.count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination
    },
    commands,
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: setRowSelection
    },
    getRowId: (row) => row.id
  })

  if (isError) {
    return (
      <Container>
        <div className="p-6">
          <Heading>Reviews</Heading>
          <p className="text-ui-fg-subtle mt-4">
            Error loading reviews: {error?.message || "Unknown error"}
          </p>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <Heading>
            Reviews
          </Heading>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
        <DataTable.CommandBar selectedLabel={(count) => `${count} selected`} />
      </DataTable>
      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Reviews",
  icon: ChatBubbleLeftRight
})

export default ReviewsPage
