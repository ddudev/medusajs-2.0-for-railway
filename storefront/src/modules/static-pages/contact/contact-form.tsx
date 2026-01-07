"use client"

import React, { useState } from "react"
import { TextField, Button, Alert } from "@mui/material"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

export default function ContactForm() {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t("contact.form.errors.nameRequired") || "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email =
        t("contact.form.errors.emailRequired") || "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email =
        t("contact.form.errors.emailInvalid") || "Invalid email address"
    }

    if (!formData.message.trim()) {
      newErrors.message =
        t("contact.form.errors.messageRequired") || "Message is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    // Simulate form submission (display-only as per requirements)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
      setFormData({ name: "", email: "", message: "" })
      setErrors({})

      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSuccess(false)
      }, 5000)
    }, 1000)
  }

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value })
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" })
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-text-primary mb-4">
        {t("contact.form.title") || "Contact Form"}
      </h2>
      <p className="text-text-secondary mb-6">
        {t("contact.form.description") ||
          "We welcome your feedback, suggestions, and complaints. They will be carefully reviewed."}
      </p>

      {isSuccess && (
        <Alert severity="success" className="mb-6">
          {t("contact.form.success") ||
            "Thank you for your message! We will get back to you soon."}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          fullWidth
          label={t("contact.form.name") || "Name"}
          value={formData.name}
          onChange={handleChange("name")}
          error={!!errors.name}
          helperText={errors.name}
          required
          disabled={isSubmitting}
        />

        <TextField
          fullWidth
          label={t("contact.form.email") || "Email Address"}
          type="email"
          value={formData.email}
          onChange={handleChange("email")}
          error={!!errors.email}
          helperText={errors.email}
          required
          disabled={isSubmitting}
        />

        <TextField
          fullWidth
          label={
            t("contact.form.message") ||
            "Write your question, suggestion or comment"
          }
          multiline
          rows={6}
          value={formData.message}
          onChange={handleChange("message")}
          error={!!errors.message}
          helperText={errors.message}
          required
          disabled={isSubmitting}
        />

        <p className="text-sm text-text-tertiary">
          {t("contact.form.requiredNote") ||
            "* Fields marked with an asterisk are mandatory"}
        </p>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isSubmitting}
          className="mt-4"
        >
          {isSubmitting
            ? t("contact.form.submitting") || "Submitting..."
            : t("contact.form.submit") || "Submit"}
        </Button>
      </form>
    </div>
  )
}
