"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { trackContactFormSubmit } from "@lib/analytics/lead-capture"

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

    // Track contact form submission as lead
    if (formData.email) {
      trackContactFormSubmit({
        email: formData.email,
        name: formData.name,
        subject: 'Contact Form',
      })
    }

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
        <div
          role="alert"
          className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
        >
          {t("contact.form.success") ||
            "Thank you for your message! We will get back to you soon."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contact-name">
            {t("contact.form.name") || "Name"}
          </Label>
          <Input
            id="contact-name"
            value={formData.name}
            onChange={handleChange("name")}
            required
            disabled={isSubmitting}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-email">
            {t("contact.form.email") || "Email Address"}
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={formData.email}
            onChange={handleChange("email")}
            required
            disabled={isSubmitting}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-message">
            {t("contact.form.message") ||
              "Write your question, suggestion or comment"}
          </Label>
          <textarea
            id="contact-message"
            rows={6}
            value={formData.message}
            onChange={handleChange("message")}
            required
            disabled={isSubmitting}
            className={`flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.message ? "border-destructive" : ""}`}
          />
          {errors.message && (
            <p className="text-sm text-destructive">{errors.message}</p>
          )}
        </div>

        <p className="text-sm text-text-tertiary">
          {t("contact.form.requiredNote") ||
            "* Fields marked with an asterisk are mandatory"}
        </p>

        <Button
          type="submit"
          className="mt-4 w-full"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t("contact.form.submitting") || "Submitting..."
            : t("contact.form.submit") || "Submit"}
        </Button>
      </form>
    </div>
  )
}
