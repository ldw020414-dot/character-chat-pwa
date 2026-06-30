const VAULT_PREFIX = 'ai-role-chat:secret:'

const encode = (value: string) => btoa(unescape(encodeURIComponent(value)))
const decode = (value: string) => decodeURIComponent(escape(atob(value)))

export const createSecretRef = (providerId: string) => `${VAULT_PREFIX}${providerId}`

export const saveSecret = (ref: string, secret: string): Promise<void> => {
  // TODO: Replace this fallback with an OS secure storage plugin for production.
  localStorage.setItem(ref, encode(secret))
  return Promise.resolve()
}

export const readSecret = (ref?: string): Promise<string> => {
  if (!ref) return Promise.resolve('')
  const stored = localStorage.getItem(ref)
  return Promise.resolve(stored ? decode(stored) : '')
}

export const deleteSecret = (ref?: string): Promise<void> => {
  if (ref) localStorage.removeItem(ref)
  return Promise.resolve()
}
