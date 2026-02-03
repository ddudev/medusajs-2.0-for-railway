"use client"

import { useState, useEffect } from "react"
import { retrieveCustomer } from "../../../../lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Rating } from "@/components/ui/rating"
import { addProductReview } from "../../../../lib/data/products"
import { toast } from "sonner"
import Link from "next/link"

type ProductReviewsFormProps = {
  productId: string
  onReviewSubmitted?: () => void
}

export default function ProductReviewsForm({ productId, onReviewSubmitted }: ProductReviewsFormProps) {
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [rating, setRating] = useState<number | null>(0)

  useEffect(() => {
    const loadCustomer = async () => {
      setIsLoadingCustomer(true)
      try {
        const customerData = await retrieveCustomer()
        setCustomer(customerData)
      } catch (error) {
        console.error("Error loading customer:", error)
        setCustomer(null)
      } finally {
        setIsLoadingCustomer(false)
      }
    }

    loadCustomer()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!content || !rating || rating < 1) {
      toast.error("Моля, попълнете всички задължителни полета.")
      return
    }

    e.preventDefault()
    setIsLoading(true)
    
    try {
      await addProductReview({
        title: title || undefined,
        content,
        rating,
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        product_id: productId,
      })
      
      setShowForm(false)
      setTitle("")
      setContent("")
      setRating(0)
      toast.success("Вашето ревю е изпратено и очаква одобрение.")

      if (onReviewSubmitted) {
        onReviewSubmitted()
      }
    } catch (error) {
      toast.error("Възникна грешка при изпращането на ревюто. Моля, опитайте отново по-късно.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (isLoadingCustomer) {
    return (
      <div className="product-page-constraint mt-8">
        <div className="flex justify-center">
          <p className="text-sm text-text-secondary">Зареждане...</p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!customer) {
    return (
      <div className="product-page-constraint mt-8">
        <div className="flex flex-col items-center gap-y-4 text-center">
          <p className="text-text-secondary">
            За да добавите ревю, моля влезте в профила си.
          </p>
          <Button asChild variant="default">
            <Link href="/account">Влез в профил</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="product-page-constraint mt-8">
      {!showForm && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowForm(true)}>
            Добави ревю
          </Button>
        </div>
      )}
      {showForm && (
        <div className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-2">
            <span className="text-xl-regular text-ui-fg-base">
              Добави ревю
            </span>

            <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="review-title">Заглавие</Label>
                <Input
                  id="review-title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Заглавие (по избор)"
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="review-content">Съдържание *</Label>
                <textarea
                  id="review-content"
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Вашето мнение за продукта..."
                  rows={4}
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Оценка *</Label>
                <Rating
                  value={rating || 0}
                  readOnly={false}
                  onChange={(newValue) => setRating(newValue)}
                  size="large"
                />
              </div>
              <div className="flex gap-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setTitle("")
                    setContent("")
                    setRating(0)
                  }}
                  disabled={isLoading}
                >
                  Отказ
                </Button>
                <Button type="submit" disabled={isLoading} variant="default">
                  {isLoading ? "Изпращане..." : "Изпрати"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
