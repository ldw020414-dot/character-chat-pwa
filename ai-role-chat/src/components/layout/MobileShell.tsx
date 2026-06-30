import {
  BookOpen,
  Bot,
  MessageCircle,
  Settings,
  Sparkles,
} from 'lucide-react'
import type { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'
import { type AppView, useAppStore } from '@/stores/app-store'

const tabs: Array<{ view: AppView; label: string; icon: typeof MessageCircle }> = [
  { view: 'chat', label: '聊天', icon: MessageCircle },
  { view: 'characters', label: '角色', icon: Bot },
  { view: 'worldbook', label: '世界书', icon: BookOpen },
  { view: 'creator', label: '创建', icon: Sparkles },
  { view: 'settings', label: '设置', icon: Settings },
]

export function MobileShell({ children }: PropsWithChildren) {
  const activeView = useAppStore((state) => state.activeView)
  const setActiveView = useAppStore((state) => state.setActiveView)

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-zinc-950 text-zinc-50 shadow-2xl shadow-black/50">
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      <nav
        className="glass grid grid-cols-5 gap-1 rounded-t-[26px] px-2 pb-[calc(0.5rem+var(--safe-bottom))] pt-2"
        aria-label="主导航"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeView === tab.view
          return (
            <button
              key={tab.view}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] text-zinc-500 transition',
                active && 'bg-white/10 text-emerald-300',
              )}
              onClick={() => setActiveView(tab.view)}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function MobileHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="glass rounded-b-[28px] px-4 pb-4 pt-[calc(0.9rem+var(--safe-top))]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 truncate text-xs text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  )
}
