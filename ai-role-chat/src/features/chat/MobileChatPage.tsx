import { Copy, RotateCcw, Square, Trash2, Users } from 'lucide-react'
import { nanoid } from 'nanoid'
import ReactMarkdown from 'react-markdown'
import { useRef, useState } from 'react'

import { MobileHeader } from '@/components/layout/MobileShell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { ProxyLLMProvider } from '@/lib/llm/proxy-provider'
import type { ChatCompletionMessage } from '@/lib/llm/types'
import { buildPrompt } from '@/lib/prompt-engine'
import {
  createChatMessage,
  createChatSession,
  useAppStore,
} from '@/stores/app-store'
import type { CharacterCard, ChatSession, GroupTurnMode } from '@/types/domain'
import {
  characterName,
  createLocalFallbackReply,
  findDefaultTemplate,
  sessionMessages,
} from './chat-utils'

type ChatMode = 'single' | 'group'

const chooseNextSpeaker = (
  members: CharacterCard[],
  currentId: string | undefined,
  mode: GroupTurnMode,
) => {
  if (members.length === 0) return undefined
  if (mode === 'manual' || mode === 'directed' || !currentId) return members[0]
  const index = members.findIndex((member) => member.id === currentId)
  return members[(index + 1) % members.length] ?? members[0]
}

export function MobileChatPage() {
  const characters = useAppStore((state) => state.characters)
  const sessions = useAppStore((state) => state.chatSessions)
  const selectedSessionId = useAppStore((state) => state.selectedSessionId)
  const messages = useAppStore((state) => state.chatMessages)
  const members = useAppStore((state) => state.groupChatMembers)
  const entries = useAppStore((state) => state.worldBookEntries)
  const templates = useAppStore((state) => state.promptTemplates)
  const providers = useAppStore((state) => state.apiProviders)
  const personas = useAppStore((state) => state.userPersonas)
  const settings = useAppStore((state) => state.appSettings)
  const addSession = useAppStore((state) => state.addSession)
  const addMessage = useAppStore((state) => state.addMessage)
  const updateMessage = useAppStore((state) => state.updateMessage)
  const deleteMessage = useAppStore((state) => state.deleteMessage)
  const clearSession = useAppStore((state) => state.clearSession)
  const addGroupMember = useAppStore((state) => state.addGroupMember)
  const selectSession = useAppStore((state) => state.selectSession)
  const [mode, setMode] = useState<ChatMode>('single')
  const [turnMode, setTurnMode] = useState<GroupTurnMode>('round_robin')
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | undefined>(
    characters[0]?.id,
  )
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('就绪')
  const [debug, setDebug] = useState('发送消息后显示世界书触发信息。')
  const abortRef = useRef<AbortController | null>(null)

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId && session.mode === mode) ??
    sessions.find((session) => session.mode === mode)
  const currentMessages = sessionMessages(messages, selectedSession)
  const primaryCharacter =
    characters.find((character) => character.id === selectedSession?.characterId) ??
    characters[0]

  const activeGroupMembers =
    selectedSession && selectedSession.mode === 'group'
      ? members
          .filter((member) => member.sessionId === selectedSession.id && !member.muted)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((member) =>
            characters.find((character) => character.id === member.characterId),
          )
          .filter((character): character is CharacterCard => Boolean(character))
      : characters.slice(0, Math.min(3, characters.length))

  const ensureSession = (): ChatSession | undefined => {
    if (selectedSession) return selectedSession
    if (mode === 'single' && !primaryCharacter) return undefined

    const session =
      mode === 'single'
        ? createChatSession('single', `和 ${primaryCharacter?.name ?? '角色'} 的会话`, primaryCharacter?.id)
        : createChatSession('group', '多角色群聊')
    addSession(session)
    selectSession(session.id)

    if (mode === 'single' && primaryCharacter) {
      addMessage(
        createChatMessage(session.id, 'assistant', primaryCharacter.firstMessage, primaryCharacter.id),
      )
    }

    if (mode === 'group') {
      characters.slice(0, 3).forEach((character, index) => {
        addGroupMember({
          id: nanoid(),
          sessionId: session.id,
          characterId: character.id,
          sortOrder: index,
          muted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      })
    }

    return session
  }

  const send = async (overrideInput?: string) => {
    const userInput = (overrideInput ?? input).trim()
    if (!userInput) return

    const session = ensureSession()
    if (!session) return

    const speaker =
      mode === 'single'
        ? primaryCharacter
        : activeGroupMembers.find((member) => member.id === currentSpeakerId) ??
          chooseNextSpeaker(activeGroupMembers, currentSpeakerId, turnMode)
    const template = findDefaultTemplate(
      templates,
      mode === 'single' ? 'single_chat' : 'group_chat',
    )
    if (!speaker || !template) return

    setInput('')
    setStatus(`${speaker.name} 正在生成`)
    const userMessage = createChatMessage(session.id, 'user', userInput)
    addMessage(userMessage)

    const prompt = buildPrompt({
      template,
      character: speaker,
      currentSpeaker: speaker,
      groupMembers: mode === 'group' ? activeGroupMembers : undefined,
      userInput,
      history: currentMessages,
      worldBookEntries: entries,
      userPersona: personas[0],
      language: settings.language,
      maxPromptTokens: 8000,
    })
    setDebug(
      `触发世界书：${
        prompt.debug.triggeredWorldBookEntries.map((entry) => entry.title).join('、') ||
        '无'
      }\n注入位置：after_system / before_user\nToken 估算：${prompt.debug.tokenEstimate}`,
    )

    const assistant = createChatMessage(session.id, 'assistant', '', speaker.id)
    addMessage(assistant)

    const providerConfig = providers.find((provider) => provider.isDefault) ?? providers[0]
    if (!providerConfig?.baseUrl) {
      updateMessage(assistant.id, {
        content: createLocalFallbackReply(
          speaker,
          userInput,
          prompt.debug.triggeredWorldBookEntries.length,
        ),
      })
      setStatus('本地 fallback')
      return
    }

    const abortController = new AbortController()
    abortRef.current = abortController
    const provider = new ProxyLLMProvider()
    let content = ''

    try {
      for await (const chunk of provider.streamChat({
        messages: prompt.messages.map(
          (message): ChatCompletionMessage => ({
            role: message.role,
            content: message.content,
          }),
        ),
        config: {
          baseUrl: providerConfig.baseUrl,
          model: providerConfig.model,
        },
        parameters: providerConfig.parameters,
        signal: abortController.signal,
      })) {
        content += chunk.contentDelta
        updateMessage(assistant.id, { content })
      }
      if (mode === 'group') {
        setCurrentSpeakerId(
          chooseNextSpeaker(activeGroupMembers, speaker.id, turnMode)?.id,
        )
      }
      setStatus('完成')
    } catch (error) {
      updateMessage(assistant.id, {
        content:
          error instanceof Error
            ? `${error.message}\n\n当前可继续离线查看本地记录；网络恢复后重试。`
            : '生成失败，请稍后重试。',
      })
      setStatus('生成失败')
    } finally {
      abortRef.current = null
    }
  }

  const regenerate = () => {
    const lastUser = [...currentMessages].reverse().find((message) => message.role === 'user')
    const lastAssistant = [...currentMessages]
      .reverse()
      .find((message) => message.role === 'assistant')
    if (lastAssistant) deleteMessage(lastAssistant.id)
    if (lastUser) void send(lastUser.content)
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <MobileHeader
        title={mode === 'single' ? primaryCharacter?.name ?? '角色聊天' : '多角色群聊'}
        subtitle={status}
        action={
          <button
            className="rounded-full bg-white/10 px-3 py-2 text-xs text-emerald-200"
            onClick={() => setMode(mode === 'single' ? 'group' : 'single')}
          >
            {mode === 'single' ? '群聊' : '单聊'}
          </button>
        }
      />

      <div className="ios-scroll min-h-0 flex-1 space-y-3 overflow-auto px-3 py-4">
        {mode === 'group' ? (
          <div className="glass rounded-3xl p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
              <Users size={14} />
              群聊成员与发言模式
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {activeGroupMembers.map((member) => (
                <button
                  key={member.id}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs ${
                    currentSpeakerId === member.id
                      ? 'bg-emerald-400 text-zinc-950'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                  onClick={() => setCurrentSpeakerId(member.id)}
                >
                  {member.name}
                </button>
              ))}
            </div>
            <select
              className="mt-2 h-9 w-full rounded-2xl border border-white/10 bg-zinc-950 px-3 text-xs"
              value={turnMode}
              onChange={(event) => setTurnMode(event.target.value as GroupTurnMode)}
            >
              <option value="manual">手动选择</option>
              <option value="round_robin">轮流发言</option>
              <option value="auto">AI 自动占位</option>
              <option value="directed">指定回应</option>
            </select>
          </div>
        ) : null}

        {currentMessages.length === 0 ? (
          <div className="glass rounded-[30px] p-5 text-sm leading-6 text-zinc-300">
            选择角色后开始聊天。世界书会根据关键词自动注入，消息会保存到
            IndexedDB，离线也能查看。
          </div>
        ) : null}

        {currentMessages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <article
              key={message.id}
              className={`group rounded-[24px] p-3 ${
                isUser
                  ? 'ml-8 bg-emerald-400 text-zinc-950'
                  : 'glass mr-8 text-zinc-100'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] opacity-70">
                <span>{characterName(characters, message.speakerId) ?? '你'}</span>
                <span>{message.tokenEstimate} tok</span>
              </div>
              <div className="prose-chat text-sm leading-6">
                <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
              </div>
              <div className="mt-2 flex justify-end gap-1 opacity-80">
                <button
                  className="rounded-full p-2"
                  onClick={() => void navigator.clipboard.writeText(message.content)}
                  aria-label="复制消息"
                >
                  <Copy size={14} />
                </button>
                <button
                  className="rounded-full p-2"
                  onClick={() => deleteMessage(message.id)}
                  aria-label="删除消息"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          )
        })}

        {settings.debugPrompt ? (
          <pre className="glass whitespace-pre-wrap rounded-3xl p-3 text-[11px] leading-5 text-zinc-400">
            {debug}
          </pre>
        ) : null}
      </div>

      <div className="glass rounded-t-[28px] px-3 pb-[calc(0.75rem+var(--safe-bottom))] pt-3">
        <Textarea
          className="max-h-32 min-h-14 resize-none rounded-3xl border-white/10 bg-zinc-950/80 px-4 py-3"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入消息..."
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={regenerate} title="重新生成">
              <RotateCcw size={16} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                abortRef.current?.abort()
                setStatus('已停止')
              }}
              title="停止"
            >
              <Square size={16} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => selectedSession && clearSession(selectedSession.id)}
              title="清空"
            >
              <Trash2 size={16} />
            </Button>
          </div>
          <Button variant="primary" className="rounded-full px-5" onClick={() => void send()}>
            发送
          </Button>
        </div>
      </div>
    </section>
  )
}
