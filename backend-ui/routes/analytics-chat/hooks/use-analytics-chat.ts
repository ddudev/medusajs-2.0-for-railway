import { useMutation, UseMutationOptions } from "@tanstack/react-query"

const backendUrl = import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000"

interface ChatRequest {
  message: string
  conversation_id?: string
  history?: Array<{ role: string; content: string }>
}

interface ChatResponse {
  response: string
  conversation_id: string
  timestamp: number
}

interface StreamCallbacks {
  onContent?: (content: string) => void
  onToolProcessing?: () => void
  onDone?: (conversationId: string, timestamp: number) => void
  onError?: (error: string) => void
}

export const useAnalyticsChat = (
  streamCallbacks?: StreamCallbacks,
  options?: UseMutationOptions<ChatResponse, Error, ChatRequest>
) => {
  return useMutation({
    mutationFn: async (payload: ChatRequest): Promise<ChatResponse> => {
      return new Promise((resolve, reject) => {
        const response = fetch(`${backendUrl}/admin/analytics-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        })

        response.then(async (res) => {
          if (!res.ok) {
            try {
              const error = await res.json()
              reject(new Error(error.message || "Failed to send message"))
            } catch {
              reject(new Error("Failed to send message"))
            }
            return
          }

          const reader = res.body?.getReader()
          const decoder = new TextDecoder()
          
          if (!reader) {
            reject(new Error("No response body"))
            return
          }

          let buffer = ''
          let fullContent = ''
          let conversationId = ''
          let timestamp = 0

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue
                
                const data = line.slice(6) // Remove 'data: ' prefix
                if (data === '[DONE]') {
                  resolve({
                    response: fullContent,
                    conversation_id: conversationId,
                    timestamp
                  })
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  
                  switch (parsed.type) {
                    case 'content':
                      fullContent += parsed.content
                      streamCallbacks?.onContent?.(parsed.content)
                      break
                    case 'tool_processing':
                      streamCallbacks?.onToolProcessing?.()
                      break
                    case 'done':
                      conversationId = parsed.conversation_id
                      timestamp = parsed.timestamp
                      streamCallbacks?.onDone?.(parsed.conversation_id, parsed.timestamp)
                      resolve({
                        response: fullContent,
                        conversation_id: parsed.conversation_id,
                        timestamp: parsed.timestamp
                      })
                      return
                    case 'error':
                      streamCallbacks?.onError?.(parsed.error)
                      reject(new Error(parsed.error))
                      return
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }

            // If we exit the loop without a 'done' event, resolve with what we have
            resolve({
              response: fullContent,
              conversation_id: conversationId || `conv_${Date.now()}`,
              timestamp: timestamp || Date.now()
            })
          } catch (error) {
            reject(error)
          }
        }).catch(reject)
      })
    },
    ...options,
  })
}
