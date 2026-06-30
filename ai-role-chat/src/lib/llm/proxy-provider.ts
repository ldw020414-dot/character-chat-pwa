import { getAccessToken } from '@/lib/auth/session'

import { LLMProviderError, mapHttpStatusToLLMError } from './errors'
import type {
  ChatCompletionChunk,
  ChatCompletionInput,
  ChatCompletionResult,
  LLMProvider,
  ProviderConfig,
  ValidationResult,
} from './types'

interface ProxyResponse {
  content?: string
  model?: string
  usage?: ChatCompletionResult['usage']
  error?: string
}

const authHeaders = () => {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const parseSseStream = async function* (
  response: Response,
): AsyncIterable<ChatCompletionChunk> {
  if (!response.body) {
    const body = (await response.json()) as ProxyResponse
    yield { contentDelta: body.content ?? '', done: true, raw: body }
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

        const parsed = JSON.parse(data) as { contentDelta?: string; error?: string }
        if (parsed.error) {
          throw new LLMProviderError('unknown', parsed.error)
        }
        if (parsed.contentDelta) {
          yield { contentDelta: parsed.contentDelta, done: false, raw: parsed }
        }
      }
    }

    yield { contentDelta: '', done: true }
  } finally {
    reader.releaseLock()
  }
}

export class ProxyLLMProvider implements LLMProvider {
  id = 'deepseek_proxy'
  name = 'DeepSeek Proxy'

  async chat(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    const response = await this.post(input, false)
    const body = (await response.json()) as ProxyResponse

    return {
      content: body.content ?? '',
      model: body.model ?? input.config.model,
      ...(body.usage ? { usage: body.usage } : {}),
    }
  }

  async *streamChat(input: ChatCompletionInput): AsyncIterable<ChatCompletionChunk> {
    const response = await this.post(input, true)
    yield* parseSseStream(response)
  }

  async validateConfig(config: ProviderConfig): Promise<ValidationResult> {
    try {
      const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          parameters: {
            temperature: 0.1,
            topP: 1,
            maxTokens: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          stream: false,
        }),
      })

      if (!response.ok) {
        const message = await response.text().catch(() => '')
        return { ok: false, message: message || '代理接口不可用。' }
      }

      return { ok: true, message: '代理接口连接成功。' }
    } catch {
      return { ok: false, message: '无法连接 API 代理。' }
    }
  }

  private async post(input: ChatCompletionInput, stream: boolean) {
    const init: RequestInit = {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: input.config.model,
        messages: input.messages,
        parameters: input.parameters,
        stream,
      }),
      ...(input.signal ? { signal: input.signal } : {}),
    }

    try {
      const response = await fetch(input.config.baseUrl, init)
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw mapHttpStatusToLLMError(response.status, text)
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

export const proxyDefaults = {
  baseUrl: '/api/chat',
  model: 'deepseek-chat',
} as const
