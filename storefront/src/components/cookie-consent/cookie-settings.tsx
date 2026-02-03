"use client"

import * as React from "react"
import { Check, Shield } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  useCookieConsent,
  defaultCategories,
} from "./cookie-provider"
import type { ConsentCategories, ConsentCategory } from "./types"
import {
  getDefaultCategories,
  getAllAcceptedCategories,
} from "./utils"
import { cn } from "@/lib/utils"

export interface CookieSettingsProps {
  className?: string
}

export function CookieSettings({ className }: CookieSettingsProps) {
  const {
    isSettingsOpen,
    closeSettings,
    state,
    updateConsent,
    config,
    acceptAll,
    rejectAll,
  } = useCookieConsent()

  const categories = config.categories ?? defaultCategories

  const [localCategories, setLocalCategories] =
    React.useState<ConsentCategories>(state.categories)

  React.useEffect(() => {
    if (isSettingsOpen) {
      setLocalCategories(state.categories)
    }
  }, [isSettingsOpen, state.categories])

  const handleToggle = (key: ConsentCategory, checked: boolean) => {
    setLocalCategories((prev) => ({
      ...prev,
      [key]: checked,
    }))
  }

  const handleSave = async () => {
    await updateConsent(localCategories)
    closeSettings()
  }

  const handleAcceptAll = async () => {
    const allAccepted = getAllAcceptedCategories()
    setLocalCategories(allAccepted)
    await acceptAll()
    closeSettings()
  }

  const handleRejectAll = async () => {
    const defaultCats = getDefaultCategories()
    setLocalCategories(defaultCats)
    await rejectAll()
    closeSettings()
  }

  return (
    <Dialog open={isSettingsOpen} onOpenChange={(open) => { if (!open) closeSettings() }}>
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Cookie Settings
          </DialogTitle>
          <DialogDescription>
            Manage your cookie preferences below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {categories.map((category) => {
            const isEnabled = localCategories[category.key]
            const isRequired = category.required

            return (
              <div
                key={category.key}
                className="flex flex-col gap-2 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={`cookie-${category.key}`}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    {category.title}
                    {isRequired && (
                      <span className="text-xs text-muted-foreground">
                        Required
                      </span>
                    )}
                  </Label>
                  <Switch
                    id={`cookie-${category.key}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleToggle(category.key, checked)
                    }
                    disabled={isRequired}
                    aria-label={`Toggle ${category.title} cookies`}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              </div>
            )
          })}
        </div>

        <Separator />

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleRejectAll}>
            Reject All
          </Button>
          <Button variant="outline" onClick={handleAcceptAll}>
            Accept All
          </Button>
          <Button onClick={handleSave}>Save Preferences</Button>
        </DialogFooter>

        {config.privacyPolicyUrl && (
          <p className="text-center text-xs text-muted-foreground">
            Read our{" "}
            <a
              href={config.privacyPolicyUrl}
              className="underline hover:no-underline"
            >
              Privacy Policy
            </a>
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
