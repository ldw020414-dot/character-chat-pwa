import { LLMProviderError, mapHttpStatusToLLMError } from './errors'
import type {
  ChatCompletionChunk,
  ChatCompletionInput,
  ChatCompletionResult,
  LLMProvider,
  ProviderConfig,
  ValidationResult,
} from './types'

interface DeepSeekChoice {
  message?: {
    content?: string
  }
  delta?: {
    content?: string
  }
}

interface DeepSeekResponse {
  model?: string
  choices?: DeepSeekChoice[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: {
    message?: string
  }
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com'

const normalizeBaseUrl = (baseUrl: string) =>
  baseUrl.replace(/\/+$/, '') || DEFAULT_BASE_URL

const makeChatUrl = (baseUrl: string) =>
  `${normalizeBaseUrl(baseUrl)}/chat/completions`

const responseMessage = async (response: Response) => {
  const text = await response.text().catch(() => '')
  if (!text) return response.statusText

  try {
    const parsed = JSON.parse(text) as DeepSeekResponse
    return parsed.error?.message ?? text
  } catch {
    return text
  }
}

const createPayload = (input: ChatCompletionInput, stream: boolean) => ({
  model: input.config.model,
  messages: input.messages,
  temperature: input.parameters.temperature,
  top_p: input.parameters.topP,
  max_tokens: input.parameters.maxTokens,
  frequency_penalty: input.parameters.frequencyPenalty,
  presence_penalty: input.parameters.presencePenalty,
  stream,
})

export class DeepSeekProvider implements LLMProvider {
  id = 'deepseek'
  name = 'DeepSeek'

  async chat(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    const response = await this.post(input, false)
    const body = (await response.json()) as DeepSeekResponse
    const content = body.choices?.[0]?.message?.content ?? ''

    return {
      content,
      model: body.model ?? input.config.model,
      usage: {
        promptTokens: body.usage?.prompt_tokens,
        completionTokens: body.usage?.completion_tokens,
        totalTokens: body.usage?.total_tokens,
      },
    }
  }

  async *streamChat(input: ChatCompletionInput): AsyncIterable<ChatCompletionChunk> {
    const response = await this.post(input, true)

    if (!response.body) {
      const fallback = await this.chat(input)
      yield { contentDelta: fallback.content, done: true, raw: fallback }
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') {
            yield { contentDelta: '', done: true }
            return
          }

          const parsed = JSON.parse(data) as DeepSeekResponse
          const delta = parsed.choices?.[0]?.delta?.content ?? ''
          if (delta) {
            yield { contentDelta: delta, done: false, raw: parsed }
          }
        }
      }

      yield { contentDelta: '', done: true }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LLMProviderError('network_error', '生成已停止。')
      }
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  async validateConfig(config: ProviderConfig): Promise<ValidationResult> {
    if (!config.apiKey?.trim()) {
      return { ok: false, message: '请先填写 API Key。' }
    }

    try {
      const apiKey = config.apiKey
      const response = await fetch(makeChatUrl(config.baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          stream: false,
        }),
      })

      if (!response.ok) {
        const message = await responseMessage(response)
        const mapped = mapHttpStatusToLLMError(response.status, message)
        return { ok: false, message: mapped.message }
      }

      return { ok: true, message: '连接成功。' }
    } catch {
      return { ok: false, message: '网络连接失败，请检查 base URL。' }
    }
  }

  private async post(input: ChatCompletionInput, stream: boolean) {
    if (!input.config.apiKey?.trim()) {
      throw new LLMProviderError('auth_failed', '缺少 DeepSeek API Key。')
    }

    try {
      const init: RequestInit = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload(input, stream)),
        ...(input.signal ? { signal: input.signal } : {}),
      }
      const response = await fetch(makeChatUrl(input.config.baseUrl), init)

      if (!response.ok) {
        const message = await responseMessage(response)
        throw mapHttpStatusToLLMError(response.status, message)
      }

      return response
    } catch (error) {
      if (error instanceof LLMProviderError) throw error
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LLMProviderError('network_error', '生成已停止。')
      }
      throw new LLMProviderError('network_error', '网络错误，请稍后重试。')
    }
  }
}

export const deepSeekDefaults = {
  baseUrl: DEFAULT_BASE_URL,
  model: 'deepseek-chat',
} as const
