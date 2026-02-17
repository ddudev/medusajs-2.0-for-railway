import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight, CircleXmarkSolid, Eye } from "@medusajs/icons"
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
  DataTablePaginationState,
  Button,
  IconButton,
  Drawer,
  Text,
  clx,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import React, { useMemo, useState } from "react"
import { sdk } from "../../src/lib/client"
import { HttpTypes } from "@medusajs/types"
import { Link } from "react-router-dom"
import { useUpdateReviewsStatus, useDeleteReview } from "../../src/hooks/api/reviews"

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


function ReviewRowActions({
  review,
  onView,
}: {
  review: Review
  onView: (review: Review) => void
}) {
  const updateStatus = useUpdateReviewsStatus()
  const deleteReview = useDeleteReview()
  const isAlreadyApproved = review.status === "approved"
  const handleApprove = () => {
    updateStatus.mutate(
      { ids: [review.id], status: "approved" },
      {
        onSuccess: () => toast.success("Review approved"),
        onError: () => toast.error("Failed to approve review"),
      }
    )
  }
  const handleDelete = () => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return
    deleteReview.mutate(review.id, {
      onSuccess: () => toast.success("Review deleted"),
      onError: () => toast.error("Failed to delete review"),
    })
  }
  return (
    <div className="flex items-center gap-1">
      <IconButton
        size="small"
        variant="transparent"
        onClick={() => onView(review)}
        title="View full review"
      >
        <Eye />
      </IconButton>
      <Button
        size="small"
        variant="secondary"
        disabled={isAlreadyApproved || updateStatus.isPending}
        onClick={handleApprove}
      >
        Approve
      </Button>
      <IconButton
        size="small"
        variant="transparent"
        className="text-ui-fg-error hover:bg-ui-bg-component hover:text-ui-fg-error"
        disabled={deleteReview.isPending}
        onClick={handleDelete}
      >
        <CircleXmarkSolid />
      </IconButton>
    </div>
  )
}

function ReviewDetailDrawer({
  review,
  open,
  onOpenChange,
  onApprove,
  onDelete,
}: {
  review: Review | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (review: Review) => void
  onDelete: (review: Review) => void
}) {
  if (!review) return null
  const isAlreadyApproved = review.status === "approved"
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Review details</Drawer.Title>
          <Drawer.Description>
            ID: {review.id}
          </Drawer.Description>
        </Drawer.Header>
        <div className="flex flex-col gap-4 p-6 pt-0">
          <div>
            <Text className="text-ui-fg-muted text-xs font-medium mb-1">Title</Text>
            <Text className="text-ui-fg-base">
              {review.title || "—"}
            </Text>
          </div>
          <div>
            <Text className="text-ui-fg-muted text-xs font-medium mb-1">Content</Text>
            <Text className="text-ui-fg-base whitespace-pre-wrap break-words">
              {review.content || "—"}
            </Text>
          </div>
          <div>
            <Text className="text-ui-fg-muted text-xs font-medium mb-1">Rating</Text>
            <Text className="text-ui-fg-base">{review.rating} / 5</Text>
          </div>
          <div>
            <Text className="text-ui-fg-muted text-xs font-medium mb-1">Status</Text>
            <StatusBadge
              color={
                review.status === "approved"
                  ? "green"
                  : review.status === "rejected"
                    ? "red"
                    : "grey"
              }
            >
              {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
            </StatusBadge>
          </div>
          <div>
            <Text className="text-ui-fg-muted text-xs font-medium mb-1">Product</Text>
            <Link
              to={`/products/${review.product_id}`}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
            >
              {review.product?.title ?? review.product_id}
            </Link>
          </div>
        </div>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-2">
            <Button
              size="small"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={isAlreadyApproved}
              onClick={() => onApprove(review)}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="secondary"
              className="text-ui-fg-error hover:bg-ui-bg-component hover:text-ui-fg-error"
              onClick={() => {
                if (!window.confirm("Delete this review? This cannot be undone.")) return
                onDelete(review)
              }}
            >
              Delete
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const columnHelper = createDataTableColumnHelper<Review>()

function getColumns(onViewReview: (review: Review) => void) {
  return [
    columnHelper.select(),
    columnHelper.accessor("id", {
      header: "ID",
    }),
    columnHelper.accessor("title", {
      header: "Title",
      cell: ({ row }) => {
        const title = row.original.title || "—"
        return (
          <button
            type="button"
            onClick={() => onViewReview(row.original)}
            className={clx(
              "text-left w-full max-w-[200px] truncate block",
              "text-ui-fg-base hover:text-ui-fg-interactive hover:underline"
            )}
            title={title}
          >
            {title}
          </button>
        )
      },
    }),
    columnHelper.accessor("rating", {
      header: "Rating", 
    }),
    columnHelper.accessor("content", {
      header: "Content",
      cell: ({ row }) => {
        const content = row.original.content || "—"
        return (
          <button
            type="button"
            onClick={() => onViewReview(row.original)}
            className={clx(
              "text-left w-full max-w-[240px] truncate block",
              "text-ui-fg-subtle hover:text-ui-fg-interactive hover:underline"
            )}
            title={content}
          >
            {content}
          </button>
        )
      },
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
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <ReviewRowActions review={row.original} onView={onViewReview} />
      ),
    }),
  ]
}

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
          body: {
            ids: reviewsToApproveIds,
            status: "approved"
          }
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
          body: {
            ids: reviewsToRejectIds,
            status: "rejected"
          }
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
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  const updateStatus = useUpdateReviewsStatus()
  const deleteReview = useDeleteReview()

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
  const columns = useMemo(
    () => getColumns((review) => setSelectedReview(review)),
    []
  )

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

  const handleDrawerApprove = (review: Review) => {
    updateStatus.mutate(
      { ids: [review.id], status: "approved" },
      {
        onSuccess: () => {
          toast.success("Review approved")
          setSelectedReview(null)
          refetch()
        },
        onError: () => toast.error("Failed to approve review"),
      }
    )
  }
  const handleDrawerDelete = (review: Review) => {
    deleteReview.mutate(review.id, {
      onSuccess: () => {
        toast.success("Review deleted")
        setSelectedReview(null)
        refetch()
      },
      onError: () => toast.error("Failed to delete review"),
    })
  }
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
      <ReviewDetailDrawer
        review={selectedReview}
        open={!!selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
        onApprove={handleDrawerApprove}
        onDelete={handleDrawerDelete}
      />
      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Reviews",
  icon: ChatBubbleLeftRight
})

export default ReviewsPage
