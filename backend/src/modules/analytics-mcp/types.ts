export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, any>
    required?: string[]
  }
}

export interface ToolExecutionResult {
  success: boolean
  data?: any
  error?: string
}

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
}

export interface ConversationContext {
  messages: ChatMessage[]
  conversationId: string
}
