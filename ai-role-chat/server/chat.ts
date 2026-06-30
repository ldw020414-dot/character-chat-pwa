import {
  jsonResponse,
  requireAuthorizedRequest,
  type ServerEnv,
} from './auth'

interface ProxyChatBody {
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  parameters: {
    temperature: number
    topP: number
    maxTokens: number
    frequencyPenalty: number
    presencePenalty: number
  }
  stream?: boolean
}

const deepSeekUrl = (env: ServerEnv) =>
  `${(env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/+$/, '')}/chat/completions`

const toPayload = (body: ProxyChatBody) => ({
  model: body.model,
  messages: body.messages,
  temperature: body.parameters.temperature,
  top_p: body.parameters.topP,
  max_tokens: body.parameters.maxTokens,
  frequency_penalty: body.parameters.frequencyPenalty,
  presence_penalty: body.parameters.presencePenalty,
  stream: Boolean(body.stream),
})

const normalizeStream = (upstream: ReadableStream<Uint8Array>) => {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            continue
          }

          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const contentDelta = parsed.choices?.[0]?.delta?.content
          if (contentDelta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ contentDelta })}\n\n`),
            )
          }
        }
      },
    }),
  )
}

export const handleChatRequest = async (
  request: Request,
  env: ServerEnv,
  extraHeaders?: HeadersInit,
) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, extraHeaders)
  }

  const auth = await requireAuthorizedRequest(request, env)
  if (!auth.ok) return auth.response

  if (!env.DEEPSEEK_API_KEY) {
    return jsonResponse({ error: 'DEEPSEEK_API_KEY is not configured' }, 500, extraHeaders)
  }

  const body = (await request.json()) as ProxyChatBody
  const upstream = await fetch(deepSeekUrl(env), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toPayload(body)),
  })

  if (!upstream.ok) {
    return jsonResponse({ error: await upstream.text() }, upstream.status, extraHeaders)
  }

  if (body.stream) {
    if (!upstream.body) {
      return jsonResponse({ error: 'Empty stream' }, 502, extraHeaders)
    }
    return new Response(normalizeStream(upstream.body), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        ...extraHeaders,
      },
    })
  }

  const upstreamBody = (await upstream.json()) as {
    model?: string
    choices?: Array<{ message?: { content?: string } }>
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }
  }

  return jsonResponse(
    {
      content: upstreamBody.choices?.[0]?.message?.content ?? '',
      model: upstreamBody.model ?? body.model,
      usage: {
        promptTokens: upstreamBody.usage?.prompt_tokens,
        completionTokens: upstreamBody.usage?.completion_tokens,
        totalTokens: upstreamBody.usage?.total_tokens,
      },
    },
    200,
    extraHeaders,
  )
}
