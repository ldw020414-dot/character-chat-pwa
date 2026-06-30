import { useEffect } from 'react'

import { AuthGate } from '@/components/auth/AuthGate'
import { MobileShell } from '@/components/layout/MobileShell'
import { MobileCharactersPage } from '@/features/characters/MobileCharactersPage'
import { MobileCreatorPage } from '@/features/characters/MobileCreatorPage'
import { MobileChatPage } from '@/features/chat/MobileChatPage'
import { MobileSettingsPage } from '@/features/settings/MobileSettingsPage'
import { MobileWorldBookPage } from '@/features/worldbook/MobileWorldBookPage'
import { useAppStore } from '@/stores/app-store'

const pages = {
  chat: <MobileChatPage />,
  characters: <MobileCharactersPage />,
  worldbook: <MobileWorldBookPage />,
  creator: <MobileCreatorPage />,
  settings: <MobileSettingsPage />,
}

export function App() {
  const activeView = useAppStore((state) => state.activeView)
  const hydrated = useAppStore((state) => state.hydrated)
  const initialize = useAppStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <AuthGate>
      <MobileShell>
        {hydrated ? (
          pages[activeView]
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            正在打开本地数据库...
          </div>
        )}
      </MobileShell>
    </AuthGate>
  )
}
