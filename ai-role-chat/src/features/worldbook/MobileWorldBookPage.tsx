import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { MobileHeader } from '@/components/layout/MobileShell'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { useAppStore } from '@/stores/app-store'
import {
  generateWorldBookCandidatesFromCharacter,
  generateWorldBookCandidatesFromMessages,
  generateWorldBookCandidatesFromStory,
} from './worldbook-service'

const splitList = (value: string) =>
  value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

export function MobileWorldBookPage() {
  const characters = useAppStore((state) => state.characters)
  const worldBooks = useAppStore((state) => state.worldBooks)
  const entries = useAppStore((state) => state.worldBookEntries)
  const messages = useAppStore((state) => state.chatMessages)
  const addWorldBookEntry = useAppStore((state) => state.addWorldBookEntry)
  const updateWorldBookEntry = useAppStore((state) => state.updateWorldBookEntry)
  const confirmWorldBookEntry = useAppStore((state) => state.confirmWorldBookEntry)
  const [story, setStory] = useState('')
  const [status, setStatus] = useState('')
  const worldBookId = worldBooks[0]?.id ?? 'wb-main'

  const generateFromStory = () => {
    if (!story.trim()) return
    generateWorldBookCandidatesFromStory(worldBookId, story).forEach(addWorldBookEntry)
    setStory('')
    setStatus('已生成待确认候选条目。')
  }

  const generateFromCharacter = () => {
    const character = characters[0]
    if (!character) return
    generateWorldBookCandidatesFromCharacter(worldBookId, character).forEach(
      addWorldBookEntry,
    )
    setStatus('已从角色卡生成候选条目。')
  }

  const generateFromHistory = () => {
    const candidates = generateWorldBookCandidatesFromMessages(worldBookId, messages)
    candidates.forEach(addWorldBookEntry)
    setStatus(candidates.length > 0 ? '已从聊天记录提取候选。' : '暂无稳定设定可提取。')
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <MobileHeader title="世界书" subtitle="关键词触发与 prompt 注入" />
      <div className="ios-scroll min-h-0 flex-1 space-y-4 overflow-auto px-3 py-4">
        <div className="glass rounded-[28px] p-4">
          <Field label="故事背景生成">
            <Textarea
              className="rounded-3xl border-white/10 bg-zinc-950/70"
              value={story}
              onChange={(event) => setStory(event.target.value)}
              placeholder="粘贴世界观、地点、组织或规则。"
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={generateFromStory}>
              <Sparkles size={15} />
              生成
            </Button>
            <Button onClick={generateFromCharacter}>从角色</Button>
            <Button onClick={generateFromHistory}>从聊天</Button>
          </div>
          {status ? <p className="mt-3 text-xs text-zinc-500">{status}</p> : null}
        </div>

        {entries.map((entry) => (
          <article key={entry.id} className="glass rounded-[28px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{entry.title}</div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  {entry.insertionPosition} · priority {entry.priority}
                </div>
              </div>
              <button
                className={`rounded-full px-3 py-1 text-xs ${
                  entry.enabled ? 'bg-emerald-400 text-zinc-950' : 'bg-white/10'
                }`}
                onClick={() => updateWorldBookEntry(entry.id, { enabled: !entry.enabled })}
              >
                {entry.enabled ? '启用' : '停用'}
              </button>
            </div>
            <Field label="关键词">
              <Input
                value={entry.keywords.join('、')}
                onChange={(event) =>
                  updateWorldBookEntry(entry.id, {
                    keywords: splitList(event.target.value),
                  })
                }
              />
            </Field>
            <Field label="内容">
              <Textarea
                className="rounded-3xl border-white/10 bg-zinc-950/70"
                value={entry.content}
                onChange={(event) =>
                  updateWorldBookEntry(entry.id, { content: event.target.value })
                }
              />
            </Field>
            {entry.pending ? (
              <Button variant="primary" onClick={() => confirmWorldBookEntry(entry.id)}>
                <Check size={15} />
                确认写入正式世界书
              </Button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
