export interface ProviderConfig {
  apiKey?: string | undefined
  baseUrl: string
  model: string
  timeoutMs?: number | undefined
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionInput {
  messages: ChatCompletionMessage[]
  config: ProviderConfig
  parameters: {
    temperature: number
    topP: number
    maxTokens: number
    frequencyPenalty: number
    presencePenalty: number
  }
  signal?: AbortSignal | undefined
}

export interface ChatCompletionResult {
  content: string
  model: string
  usage?: {
    promptTokens?: number | undefined
    completionTokens?: number | undefined
    totalTokens?: number | undefined
  }
}

export interface ChatCompletionChunk {
  contentDelta: string
  done: boolean
  raw?: unknown
}

export interface ValidationResult {
  ok: boolean
  message: string
}

export interface LLMProvider {
  id: string
  name: string
  chat(input: ChatCompletionInput): Promise<ChatCompletionResult>
  streamChat(input: ChatCompletionInput): AsyncIterable<ChatCompletionChunk>
  validateConfig(config: ProviderConfig): Promise<ValidationResult>
}
