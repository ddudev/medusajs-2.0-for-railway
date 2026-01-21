import { Button, Checkbox, InlineTip, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

interface AIEnhancePopupProps {
  onEnhance: (isComplex: boolean) => void
  onCancel: () => void
  isLoading: boolean
}

export const AIEnhancePopup = ({ onEnhance, onCancel, isLoading }: AIEnhancePopupProps) => {
  const { t } = useTranslation()
  const [isComplex, setIsComplex] = useState(false)

  const handleEnhance = () => {
    onEnhance(isComplex)
  }

  return (
    <div className="flex flex-col gap-y-6 m-5 p-5 rounded-lg border border-ui-border-base">
      <div className="flex flex-col gap-y-4">
        <div className="flex items-start gap-x-3">
          <Checkbox
            id="is-complex"
            checked={isComplex}
            onCheckedChange={(checked) => setIsComplex(checked === true)}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="is-complex"
              className="text-ui-fg-base cursor-pointer text-sm font-medium"
            >
              This is a complex product
            </label>
            <Text size="small" className="text-ui-fg-subtle">
              Complex products receive detailed technical descriptions (300-500 words).
              Simple products get concise descriptions (100-200 words).
            </Text>
          </div>
        </div>

        <InlineTip variant="warning">
          <div className="flex flex-col gap-y-1">
            <Text size="small" weight="plus">
              This action will overwrite:
            </Text>
            <ul className="list-disc pl-5">
              <li className="text-ui-fg-subtle text-xs">Product title (optimized version)</li>
              <li className="text-ui-fg-subtle text-xs">Product description</li>
              <li className="text-ui-fg-subtle text-xs">SEO metadata (meta title, meta description, keywords)</li>
              <li className="text-ui-fg-subtle text-xs">Open Graph metadata for social sharing</li>
            </ul>
          </div>
        </InlineTip>

        <div className="bg-ui-bg-subtle rounded-lg p-4">
          <Text size="small" weight="plus" className="mb-2">
            AI will analyze:
          </Text>
          <ul className="list-disc pl-5">
            <li className="text-ui-fg-subtle text-xs">Product images (colors, materials, features)</li>
            <li className="text-ui-fg-subtle text-xs">Current product information (title, description, material)</li>
            <li className="text-ui-fg-subtle text-xs">Visual elements and text on product</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-end gap-x-2 border-t border-ui-border-base pt-4">
        <Button 
          type="button"
          size="small" 
          variant="secondary" 
          onClick={onCancel} 
          disabled={isLoading}
        >
          {t("actions.cancel")}
        </Button>
        <Button 
          type="button"
          size="small" 
          variant="primary" 
          onClick={handleEnhance} 
          isLoading={isLoading}
        >
          {isLoading ? "Enhancing..." : "Enhance with AI"}
        </Button>
      </div>
    </div>
  )
}
