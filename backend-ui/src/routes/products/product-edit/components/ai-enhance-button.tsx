import { Sparkles } from "@medusajs/icons"
import { Button, toast, Prompt } from "@medusajs/ui"
import { useState } from "react"
import { useEnhanceProductWithAI } from "../../../../hooks/api/products"
import { AIEnhancePopup } from "./ai-enhance-popup"

interface AIEnhanceButtonProps {
  productId: string
  onSuccess: () => void
}

export const AIEnhanceButton = ({ productId, onSuccess }: AIEnhanceButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { mutateAsync, isPending } = useEnhanceProductWithAI(productId)

  const handleEnhance = async (isComplex: boolean) => {
    try {
      await mutateAsync(
        { isComplex },
        {
          onSuccess: () => {
            toast.success("Product enhanced with AI successfully", {
              description: "Product content and metadata have been updated",
            })
            setIsOpen(false)
            onSuccess()
          },
          onError: (error) => {
            toast.error("Failed to enhance product", {
              description: error.message || "Please try again later",
            })
          },
        }
      )
    } catch (error) {
      // Error already handled in onError callback
      console.error("Enhancement error:", error)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="small"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        <Sparkles className="mr-2" />
        Enhance with AI
      </Button>

      <Prompt open={isOpen} onOpenChange={setIsOpen}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Enhance Product with AI</Prompt.Title>
            <Prompt.Description>
              AI will analyze product images and generate SEO-optimized content
            </Prompt.Description>
          </Prompt.Header>
          <AIEnhancePopup
            onEnhance={handleEnhance}
            onCancel={() => setIsOpen(false)}
            isLoading={isPending}
          />
        </Prompt.Content>
      </Prompt>
    </>
  )
}
