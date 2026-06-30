import { LockKeyhole } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { loginWithPassword, readAccessSession } from '@/lib/auth/session'

export function AuthGate({ children }: PropsWithChildren) {
  const [authorized, setAuthorized] = useState(() => Boolean(readAccessSession()))
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!password.trim()) return
    setSubmitting(true)
    setStatus('')
    try {
      await loginWithPassword(password)
      setAuthorized(true)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '登录失败。')
    } finally {
      setSubmitting(false)
    }
  }

  if (authorized) return children

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-zinc-950 px-5 text-zinc-50">
      <div className="glass w-full max-w-sm rounded-[32px] p-5">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-zinc-950">
          <LockKeyhole size={24} />
        </div>
        <h1 className="text-xl font-semibold">访问保护</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          输入部署时配置的访问密码。密码只发送到自己的 `/api/auth`
          校验，不会写进前端代码。
        </p>
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="访问密码"
          />
          <Button
            className="w-full rounded-2xl"
            variant="primary"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '校验中...' : '进入应用'}
          </Button>
        </form>
        {status ? <p className="mt-3 text-sm text-red-300">{status}</p> : null}
      </div>
    </div>
  )
}
