export interface AccessSession {
  token: string
  expiresAt: number
}

const STORAGE_KEY = 'ai-role-chat:access-session'

export const readAccessSession = (): AccessSession | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as AccessSession
    if (!session.token || session.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const saveAccessSession = (session: AccessSession) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export const clearAccessSession = () => {
  localStorage.removeItem(STORAGE_KEY)
}

export const getAccessToken = () => readAccessSession()?.token

export const loginWithPassword = async (password: string) => {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })

  if (!response.ok) {
    throw new Error(response.status === 401 ? '访问密码不正确。' : '访问校验失败。')
  }

  const session = (await response.json()) as AccessSession
  saveAccessSession(session)
  return session
}
