import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeepSeekProvider } from '@/lib/llm/deepseek-provider'
import { LLMProviderError } from '@/lib/llm/errors'
import type { ChatCompletionInput } from '@/lib/llm/types'

const input: ChatCompletionInput = {
  messages: [{ role: 'user', content: 'hi' }],
  config: {
    apiKey: 'test-key',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  parameters: {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 10,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('DeepSeekProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('handles non-streaming chat', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        model: 'deepseek-chat',
        choices: [{ message: { content: 'hello' } }],
      }),
    )

    const result = await new DeepSeekProvider().chat(input)

    expect(result.content).toBe('hello')
  })

  it('maps auth failures to provider errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { message: 'bad key' } }, 401),
    )

    await expect(new DeepSeekProvider().chat(input)).rejects.toBeInstanceOf(
      LLMProviderError,
    )
  })

  it('parses streaming SSE chunks', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"你"}}]}\n\n' +
              'data: {"choices":[{"delta":{"content":"好"}}]}\n\n' +
              'data: [DONE]\n\n',
          ),
        )
        controller.close()
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream))

    const chunks: string[] = []
    for await (const chunk of new DeepSeekProvider().streamChat(input)) {
      chunks.push(chunk.contentDelta)
    }

    expect(chunks.join('')).toBe('你好')
  })
})
