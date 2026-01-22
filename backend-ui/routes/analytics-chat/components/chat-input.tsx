import { useState } from "react"
import { Button, Input } from "@medusajs/ui"
import { PaperPlane } from "@medusajs/icons"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="border-t border-ui-border-base bg-ui-bg-base py-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6">
        <div className="relative flex items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Assistant..."
            disabled={disabled}
            className="w-full pr-12 rounded-xl shadow-sm"
            autoFocus
          />
          <Button 
            type="submit" 
            disabled={disabled || !input.trim()}
            className="absolute right-2 p-2"
            variant="transparent"
          >
            <PaperPlane className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
