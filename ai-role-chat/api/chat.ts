import { handleChatRequest } from '../server/chat'

export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request): Promise<Response> {
  return handleChatRequest(request, {
    APP_PASSWORD: process.env.APP_PASSWORD,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
  })
}
