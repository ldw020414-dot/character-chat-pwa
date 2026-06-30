export interface ServerEnv {
  APP_PASSWORD?: string
  DEEPSEEK_API_KEY?: string
  DEEPSEEK_BASE_URL?: string
}

export interface AccessTokenPayload {
  issuedAt: number
  expiresAt: number
  scope: 'app'
}

const encoder = new TextEncoder()
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const base64UrlEncodeText = (value: string) =>
  base64UrlEncode(encoder.encode(value))

const base64UrlDecodeText = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '=',
  )
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const importHmacKey = (secret: string) =>
  crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )

const sign = async (secret: string, value: string) => {
  const key = await importHmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return base64UrlEncode(new Uint8Array(signature))
}

const verifySignature = async (secret: string, value: string, signature: string) => {
  const key = await importHmacKey(secret)
  const padded = signature.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(signature.length / 4) * 4,
    '=',
  )
  const binary = atob(padded)
  const signatureBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(value))
}

export const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })

export const createAccessToken = async (appPassword: string) => {
  const payload: AccessTokenPayload = {
    issuedAt: Date.now(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
    scope: 'app',
  }
  const payloadPart = base64UrlEncodeText(JSON.stringify(payload))
  const signaturePart = await sign(appPassword, payloadPart)
  return {
    token: `${payloadPart}.${signaturePart}`,
    expiresAt: payload.expiresAt,
  }
}

export const verifyAccessToken = async (token: string, appPassword: string) => {
  const [payloadPart, signaturePart] = token.split('.')
  if (!payloadPart || !signaturePart) return false

  const verified = await verifySignature(appPassword, payloadPart, signaturePart)
  if (!verified) return false

  try {
    const payload = JSON.parse(base64UrlDecodeText(payloadPart)) as AccessTokenPayload
    return payload.scope === 'app' && payload.expiresAt > Date.now()
  } catch {
    return false
  }
}

export const getBearerToken = (request: Request) => {
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]
}

export const requireAppPassword = (env: ServerEnv) => {
  const appPassword = env.APP_PASSWORD?.trim()
  if (!appPassword) {
    return {
      ok: false as const,
      response: jsonResponse({ error: 'APP_PASSWORD is not configured' }, 500),
    }
  }
  return { ok: true as const, appPassword }
}

export const requireAuthorizedRequest = async (request: Request, env: ServerEnv) => {
  const passwordResult = requireAppPassword(env)
  if (!passwordResult.ok) return passwordResult

  const token = getBearerToken(request)
  if (!token) {
    return {
      ok: false as const,
      response: jsonResponse({ error: 'Unauthorized' }, 401),
    }
  }

  const authorized = await verifyAccessToken(token, passwordResult.appPassword)
  if (!authorized) {
    return {
      ok: false as const,
      response: jsonResponse({ error: 'Unauthorized' }, 401),
    }
  }

  return { ok: true as const }
}

export const handleAuthRequest = async (request: Request, env: ServerEnv) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const passwordResult = requireAppPassword(env)
  if (!passwordResult.ok) return passwordResult.response

  const body = (await request.json().catch(() => ({}))) as { password?: string }
  if (!body.password || body.password !== passwordResult.appPassword) {
    return jsonResponse({ error: 'Invalid password' }, 401)
  }

  return jsonResponse(await createAccessToken(passwordResult.appPassword))
}
