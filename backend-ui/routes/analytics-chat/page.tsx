import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Heading } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import ChatInterface from "./components/chat-interface"

export const config = defineRouteConfig({
  label: "Assistant",
  icon: Sparkles,
})

export default function AnalyticsChatPage() {
  return (
    <div className="flex h-full flex-col bg-ui-bg-subtle">
      <ChatInterface />
    </div>
  )
}
