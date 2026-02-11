"use client"

import { Link } from "react-router-dom"
import { Button, Container, Heading, Input, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { KeyboundForm } from "../../../../components/utilities/keybound-form"
import { sdk, backendUrl } from "../../../../lib/client"
import { normalizeEmbedUrl } from "../../../../lib/embed-url"

export function AnalyticsSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [embedUrl, setEmbedUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const res = await sdk.client.fetch<{ posthog_dashboard_embed_url: string | null }>(
          "/admin/analytics/settings",
          { method: "GET" }
        )
        const raw = res.posthog_dashboard_embed_url ?? ""
        setEmbedUrl(normalizeEmbedUrl(raw) ?? raw)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings")
        toast.error("Failed to load analytics settings")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const url = `${backendUrl}/admin/analytics/settings`
      const normalized = normalizeEmbedUrl(embedUrl) || null
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ posthog_dashboard_embed_url: normalized }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || "Failed to save")
      }
      toast.success("Analytics settings saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save analytics settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <Heading level="h1">Analytics</Heading>
      </div>
      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle text-ui-fg-error text-sm">
            {error}
          </div>
        )}
        {isLoading ? (
          <p className="text-ui-fg-subtle">Loading...</p>
        ) : (
          <KeyboundForm onSubmit={onSubmit}>
            <div className="flex flex-col gap-y-6">
              <div className="flex flex-col gap-y-2">
                <label className="text-ui-fg-subtle text-sm font-medium">
                  PostHog dashboard embed URL
                </label>
                <Input
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://us.posthog.com/embedded/..."
                />
                <p className="text-ui-fg-muted text-xs">
                  Share your PostHog dashboard publicly, then paste the embed URL here. Leave empty to hide the embed on the{" "}
                  <Link to="/analytics" className="text-ui-fg-interactive hover:underline">
                    Analytics
                  </Link>{" "}
                  page.
                </p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSaving}>
                  Save
                </Button>
              </div>
            </div>
          </KeyboundForm>
        )}
      </div>
    </Container>
  )
}
