import { useState, useEffect, useRef } from "react"
import { Button } from "@medusajs/ui"
import MessageList from "./message-list"
import ChatInput from "./chat-input"
import ExamplePrompts from "./example-prompts"
import { useAnalyticsChat } from "../hooks/use-analytics-chat"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string>()
  const [streamingContent, setStreamingContent] = useState<string>("")
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamingMessageIdRef = useRef<string>()

  const { mutate: sendMessage, isPending } = useAnalyticsChat(
    {
      onContent: (content) => {
        setIsStreaming(true)
        setStreamingContent(prev => prev + content)
      },
      onToolProcessing: () => {
        // Could show a "Processing data..." indicator
      },
      onDone: (convId, timestamp) => {
        // Finalize the streaming message
        setIsStreaming(false)
        
        // Use a callback to ensure we get the latest streamingContent
        setStreamingContent(currentContent => {
          const finalMessage: Message = {
            id: streamingMessageIdRef.current || `msg_${Date.now()}`,
            role: "assistant",
            content: currentContent,
            timestamp
          }
          
          setMessages(prev => {
            const newMessages = [...prev, finalMessage]
            saveToLocalStorage(convId, newMessages)
            return newMessages
          })
          setConversationId(convId)
          streamingMessageIdRef.current = undefined
          
          // Clear after adding to messages
          return ""
        })
      },
      onError: (error) => {
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `Sorry, I encountered an error: ${error}. Please try again.`,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, errorMessage])
        setStreamingContent("")
        setIsStreaming(false)
        streamingMessageIdRef.current = undefined
      }
    },
    {
      onSuccess: (data) => {
        // This is called after streaming completes
        // The message is already added in onDone callback
      },
      onError: (error) => {
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, errorMessage])
        setStreamingContent("")
        setIsStreaming(false)
        streamingMessageIdRef.current = undefined
      }
    }
  )

  // Load conversation from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("analytics_chat_current")
    if (saved) {
      try {
        const { conversationId: id, messages: msgs } = JSON.parse(saved)
        setConversationId(id)
        // Only load last 6 messages to avoid overwhelming the model
        setMessages(msgs.slice(-6))
      } catch (error) {
        console.error("Failed to load conversation:", error)
      }
    }
  }, [])

  const handleNewConversation = () => {
    setMessages([])
    setConversationId(undefined)
    localStorage.removeItem("analytics_chat_current")
  }

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMessage])
    
    // Generate ID for the streaming message
    streamingMessageIdRef.current = `msg_${Date.now() + 1}`
    setStreamingContent("")
    setIsStreaming(true)
    
    sendMessage({
      message: content,
      conversation_id: conversationId,
      history: messages.map(m => ({ role: m.role, content: m.content }))
    })
  }

  const handleExampleClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const saveToLocalStorage = (id: string, msgs: Message[]) => {
    try {
      localStorage.setItem("analytics_chat_current", JSON.stringify({
        conversationId: id,
        messages: msgs
      }))
    } catch (error) {
      console.error("Failed to save conversation:", error)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {messages.length > 0 && (
        <div className="flex items-center justify-between border-b border-ui-border-base bg-ui-bg-base px-6 py-3">
          <h2 className="text-ui-fg-base text-sm font-medium">Chat Assistant</h2>
          <Button
            variant="secondary"
            size="small"
            onClick={handleNewConversation}
          >
            New Chat
          </Button>
        </div>
      )}
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto">
          <ExamplePrompts onPromptClick={handleExampleClick} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} isLoading={false} />
          {isStreaming && streamingContent && (
            <div className="bg-ui-bg-subtle py-6">
              <div className="mx-auto max-w-3xl px-6">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-ui-tag-green-bg">
                    <span className="text-ui-tag-green-text text-sm font-semibold">AI</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="text-ui-fg-base whitespace-pre-wrap text-sm">
                      {streamingContent}
                      <span className="animate-pulse">▋</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {isPending && !isStreaming && (
            <div className="bg-ui-bg-subtle py-6">
              <div className="mx-auto max-w-3xl px-6">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-ui-tag-green-bg">
                    <span className="text-ui-tag-green-text text-sm font-semibold">AI</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-ui-fg-muted" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-ui-fg-muted" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-ui-fg-muted" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
      <ChatInput onSend={handleSendMessage} disabled={isPending || isStreaming} />
    </div>
  )
}
