import { handleChatRequest } from '../../server/chat'
import type { ServerEnv } from '../../server/auth'

interface PagesContext {
  request: Request
  env: ServerEnv
}

export const onRequestPost = (context: PagesContext) =>
  handleChatRequest(context.request, context.env)

export const onRequestOptions = () => new Response(null, { status: 204 })
