import { describe, expect, it } from 'vitest'

import {
  handleAuthRequest,
  verifyAccessToken,
} from '../../server/auth'
import { handleChatRequest } from '../../server/chat'

describe('access protection', () => {
  it('rejects an invalid app password', async () => {
    const response = await handleAuthRequest(
      new Request('https://app.test/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'wrong' }),
      }),
      { APP_PASSWORD: 'secret' },
    )

    expect(response.status).toBe(401)
  })

  it('creates a signed token for the correct app password', async () => {
    const response = await handleAuthRequest(
      new Request('https://app.test/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'secret' }),
      }),
      { APP_PASSWORD: 'secret' },
    )
    const body = (await response.json()) as { token: string }

    expect(response.status).toBe(200)
    await expect(verifyAccessToken(body.token, 'secret')).resolves.toBe(true)
  })

  it('blocks chat requests without an access token', async () => {
    const response = await handleChatRequest(
      new Request('https://app.test/api/chat', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      {
        APP_PASSWORD: 'secret',
        DEEPSEEK_API_KEY: 'not-used',
      },
    )

    expect(response.status).toBe(401)
  })
})
