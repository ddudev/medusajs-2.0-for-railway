"use client"

import { useState, useEffect } from "react"
import { retrieveCustomer } from "../../../../lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import { Button, TextField, Rating, Typography } from "@mui/material"
import { addProductReview } from "../../../../lib/data/products"
import { Snackbar, Alert } from "@mui/material"
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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

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
      setSnackbar({
        open: true,
        message: "Моля, попълнете всички задължителни полета.",
        severity: 'error'
      })
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
      setSnackbar({
        open: true,
        message: "Вашето ревю е изпратено и очаква одобрение.",
        severity: 'success'
      })
      
      if (onReviewSubmitted) {
        onReviewSubmitted()
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Възникна грешка при изпращането на ревюто. Моля, опитайте отново по-късно.",
        severity: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (isLoadingCustomer) {
    return (
      <div className="product-page-constraint mt-8">
        <div className="flex justify-center">
          <Typography variant="body2" color="text.secondary">
            Зареждане...
          </Typography>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!customer) {
    return (
      <div className="product-page-constraint mt-8">
        <div className="flex flex-col items-center gap-y-4 text-center">
          <Typography variant="body1" color="text.secondary">
            За да добавите ревю, моля влезте в профила си.
          </Typography>
          <Button 
            variant="contained" 
            component={Link}
            href="/account"
          >
            Влез в профил
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="product-page-constraint mt-8">
      {!showForm && (
        <div className="flex justify-center">
          <Button variant="outlined" onClick={() => setShowForm(true)}>
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
                <TextField 
                  name="title" 
                  label="Заглавие"
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Заглавие (по избор)" 
                  fullWidth
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <TextField 
                  name="content" 
                  label="Съдържание *"
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Вашето мнение за продукта..." 
                  multiline
                  rows={4}
                  required
                  fullWidth
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <span className="text-sm font-medium text-text-primary mb-1">Оценка *</span>
                <Rating
                  value={rating || 0}
                  onChange={(_, newValue) => {
                    setRating(newValue)
                  }}
                  size="large"
                />
              </div>
              <div className="flex gap-x-2">
                <Button 
                  type="button" 
                  variant="outlined" 
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
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  variant="contained"
                >
                  {isLoading ? "Изпращане..." : "Изпрати"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  )
}
