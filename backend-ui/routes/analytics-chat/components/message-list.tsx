import MessageBubble from "./message-bubble"
import TypingIndicator from "./typing-indicator"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="w-full">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
          timestamp={message.timestamp}
        />
      ))}
      {isLoading && <TypingIndicator />}
    </div>
  )
}
