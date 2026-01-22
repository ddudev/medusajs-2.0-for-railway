import { Text } from "@medusajs/ui"
import ReactMarkdown from "react-markdown"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user"
  
  return (
    <div className={`py-6 ${isUser ? "bg-ui-bg-base" : "bg-ui-bg-subtle"}`}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex gap-6">
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center text-xs font-medium ${
            isUser 
              ? "bg-blue-600 text-white" 
              : "bg-green-600 text-white"
          }`}>
            {isUser ? "Y" : "AI"}
          </div>
          
          {/* Message content */}
          <div className="flex-1 min-w-0 pt-1">
            {isUser ? (
              <div className="text-ui-fg-base">{content}</div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-3 prose-pre:bg-ui-bg-base prose-pre:border prose-pre:border-ui-border-base">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
