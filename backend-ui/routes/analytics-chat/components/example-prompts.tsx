import { Button, Heading, Text } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"

const EXAMPLE_PROMPTS = [
  "Show me top 10 products by revenue this month",
  "Compare Q3 2024 vs Q3 2023 revenue",
  "Which customers haven't ordered in 60 days?",
  "What's my average order value this year?",
  "Show me products with low stock",
  "Analyze sales trends by day of week",
]

interface ExamplePromptsProps {
  onPromptClick: (prompt: string) => void
}

export default function ExamplePrompts({ onPromptClick }: ExamplePromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-8 max-w-2xl mx-auto w-full">
      <div className="flex flex-col items-center gap-3">
        <Sparkles className="text-ui-fg-interactive w-12 h-12" />
        <Heading level="h2" className="text-2xl">How can I help you today?</Heading>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full">
        {EXAMPLE_PROMPTS.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptClick(prompt)}
            className="text-left p-3 rounded-xl border border-ui-border-base hover:bg-ui-bg-base-hover transition-colors text-sm"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
