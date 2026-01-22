export default function TypingIndicator() {
  return (
    <div className="py-6 bg-ui-bg-subtle">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-green-600 text-white flex items-center justify-center text-xs font-medium">
            AI
          </div>
          
          {/* Typing animation */}
          <div className="flex items-center gap-1 pt-1">
            <div className="w-2 h-2 bg-ui-fg-subtle rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-ui-fg-subtle rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-ui-fg-subtle rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  )
}
