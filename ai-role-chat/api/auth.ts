import { handleAuthRequest } from '../server/auth'

export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request): Promise<Response> {
  return handleAuthRequest(request, {
    APP_PASSWORD: process.env.APP_PASSWORD,
  })
}
