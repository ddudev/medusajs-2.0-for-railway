"use client"

import { fetchProductReviewsClient } from "../../../../lib/data/products"
import { Rating, Typography, Button, Skeleton } from "@mui/material"
import { StoreProductReview } from "../../../../types/global"
import { useState, useEffect } from "react"
import ProductReviewsForm from "./form"

type ProductReviewsProps = {
  productId: string
}

function ReviewItem({ review }: { review: StoreProductReview }) {
  return (
    <div className="flex flex-col gap-y-2 text-base-regular text-ui-fg-base border-b border-ui-border-base pb-6 mb-6 last:border-b-0 last:mb-0">
      <div className="flex gap-x-2 items-center">
        {review.title && (
          <Typography variant="h6" component="strong" className="text-text-primary">
            {review.title}
          </Typography>
        )}
        <Rating value={review.rating} readOnly size="small" />
      </div>
      <div className="text-text-secondary">{review.content}</div>
      <div className="border-t border-ui-border-base pt-4 text-sm-regular text-text-secondary">
        {review.first_name} {review.last_name}
        {review.created_at && (
          <span className="ml-2">
            • {new Date(review.created_at).toLocaleDateString('bg-BG')}
          </span>
        )}
      </div>
    </div>
  )
}

export default function ProductReviews({
  productId,
}: ProductReviewsProps) {
  const [page, setPage] = useState(1)
  const defaultLimit = 10
  const [reviews, setReviews] = useState<StoreProductReview[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [hasMoreReviews, setHasMoreReviews] = useState(false)
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReviews = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchProductReviewsClient({
          productId,
          limit: defaultLimit,
          offset: (page - 1) * defaultLimit,
        })
        
        setReviews((prev) => {
          const newReviews = result.reviews.filter(
            (review) => !prev.some((r) => r.id === review.id)
          )
          return [...prev, ...newReviews]
        })
        setAverageRating(Math.round(result.average_rating))
        setHasMoreReviews(result.count > result.limit * page)
        setCount(result.count)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews')
        console.error('Error loading reviews:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadReviews()
  }, [page, productId])

  const handleLoadMore = () => {
    setPage(page + 1)
  }

  const handleReviewSubmitted = () => {
    // Reset and reload reviews
    setPage(1)
    setReviews([])
    // Trigger reload by updating page
    setTimeout(() => {
      setPage(1)
    }, 100)
  }

  if (isLoading && reviews.length === 0) {
    return (
      <div className="product-page-constraint">
        <Skeleton variant="rectangular" height={200} className="mb-4" />
        <Skeleton variant="text" height={32} width="60%" className="mb-2" />
        <Skeleton variant="text" height={24} width="40%" />
      </div>
    )
  }

  if (error && reviews.length === 0) {
    return (
      <div className="product-page-constraint">
        <Typography variant="body1" color="error">
          Грешка при зареждане на ревюта: {error}
        </Typography>
      </div>
    )
  }

  return (
    <div className="product-page-constraint">
      <div className="flex flex-col items-center text-center mb-16">
        <span className="text-base-regular text-gray-600 mb-6">
          Мнения на клиенти
        </span>
        <p className="text-2xl-regular text-ui-fg-base max-w-lg">
          Вижте какво казват нашите клиенти за този продукт.
        </p>
        {count > 0 && (
          <div className="flex gap-x-2 justify-center items-center mt-4">
            <Rating value={averageRating} readOnly size="large" />
            <span className="text-base-regular text-gray-600">
              {averageRating.toFixed(1)} ({count} {count === 1 ? 'ревю' : 'ревюта'})
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 && !isLoading ? (
        <div className="text-center py-8">
          <Typography variant="body1" color="text.secondary">
            Все още няма ревюта за този продукт.
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-y-6">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      )}

      {hasMoreReviews && (
        <div className="flex justify-center mt-8">
          <Button 
            variant="outlined" 
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Зареждане..." : "Покажи още ревюта"}
          </Button>
        </div>
      )}

      <ProductReviewsForm productId={productId} onReviewSubmitted={handleReviewSubmitted} />
    </div>
  )
}
