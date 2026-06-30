import { handleAuthRequest, type ServerEnv } from '../server/auth'
import { handleChatRequest } from '../server/chat'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default {
  async fetch(request: Request, env: ServerEnv): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    const path = new URL(request.url).pathname
    if (path.endsWith('/api/auth')) {
      return handleAuthRequest(request, env)
    }
    if (path.endsWith('/api/chat')) {
      return handleChatRequest(request, env, corsHeaders)
    }

    return new Response('Not found', { status: 404, headers: corsHeaders })
  },
}
