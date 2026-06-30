import { Copy, Download, Plus, Search, Trash2, Upload } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useMemo, useState } from 'react'

import { MobileHeader } from '@/components/layout/MobileShell'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { exportCharacterJson, importCharacterJson } from '@/lib/export/exporters'
import { characterCardSchema } from '@/lib/validation/schemas'
import { useAppStore } from '@/stores/app-store'
import type { CharacterCard } from '@/types/domain'

const emptyCharacter = (): CharacterCard => {
  const timestamp = new Date().toISOString()
  return {
    id: nanoid(),
    name: '',
    avatar: '',
    summary: '',
    personality: '',
    scenario: '',
    firstMessage: '',
    exampleDialogues: [],
    speakingStyle: '',
    background: '',
    likes: [],
    dislikes: [],
    creatorNotes: '',
    tags: [],
    version: '1.0.0',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const splitList = (value: string) =>
  value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

export function MobileCharactersPage() {
  const characters = useAppStore((state) => state.characters)
  const addCharacter = useAppStore((state) => state.addCharacter)
  const updateCharacter = useAppStore((state) => state.updateCharacter)
  const deleteCharacter = useAppStore((state) => state.deleteCharacter)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<CharacterCard | null>(null)
  const [ioText, setIoText] = useState('')
  const [status, setStatus] = useState('')

  const filteredCharacters = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase()
    if (!keyword) return characters
    return characters.filter((character) =>
      [character.name, character.summary, character.tags.join(' ')]
        .join(' ')
        .toLocaleLowerCase()
        .includes(keyword),
    )
  }, [characters, query])

  const save = () => {
    if (!draft) return
    const parsed = characterCardSchema.safeParse(draft)
    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message ?? '角色卡校验失败')
      return
    }
    if (characters.some((character) => character.id === draft.id)) {
      updateCharacter(draft.id, parsed.data)
    } else {
      addCharacter(parsed.data)
    }
    setStatus('角色卡已保存到 IndexedDB。')
  }

  const importJson = () => {
    try {
      const character = importCharacterJson(ioText)
      addCharacter({ ...character, id: character.id || nanoid() })
      setStatus('角色卡已导入。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败。')
    }
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <MobileHeader
        title="角色"
        subtitle={`${characters.length} 张角色卡`}
        action={
          <button
            className="rounded-full bg-emerald-400 p-2 text-zinc-950"
            onClick={() => setDraft(emptyCharacter())}
            aria-label="新建角色"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="ios-scroll min-h-0 flex-1 space-y-4 overflow-auto px-3 py-4">
        <label className="glass flex items-center gap-2 rounded-3xl px-4 py-3">
          <Search size={17} className="text-zinc-500" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索角色、标签、简介"
          />
        </label>

        <div className="grid gap-3">
          {filteredCharacters.map((character) => (
            <button
              key={character.id}
              className="glass rounded-[28px] p-4 text-left"
              onClick={() => setDraft(character)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{character.name}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-zinc-400">
                    {character.summary}
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-zinc-400">
                  {character.version}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-400/12 px-2 py-1 text-[11px] text-emerald-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="glass rounded-[28px] p-4">
          <div className="mb-3 text-sm font-medium">导入 / 导出角色卡 JSON</div>
          <Textarea
            className="min-h-28 rounded-3xl border-white/10 bg-zinc-950/70 font-mono text-xs"
            value={ioText}
            onChange={(event) => setIoText(event.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={importJson}>
              <Upload size={15} />
              导入
            </Button>
            <Button
              onClick={() => {
                if (characters[0]) setIoText(exportCharacterJson(characters[0]))
              }}
            >
              <Download size={15} />
              导出首个
            </Button>
          </div>
        </div>
      </div>

      {draft ? (
        <div className="glass max-h-[78dvh] overflow-auto rounded-t-[32px] p-4 pb-[calc(1rem+var(--safe-bottom))]">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">{draft.name || '新角色'}</div>
            <button className="text-sm text-zinc-400" onClick={() => setDraft(null)}>
              收起
            </button>
          </div>
          <div className="grid gap-3">
            <Field label="名称">
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="简介">
              <Input
                value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
              />
            </Field>
            <Field label="性格">
              <Textarea
                value={draft.personality}
                onChange={(event) =>
                  setDraft({ ...draft, personality: event.target.value })
                }
              />
            </Field>
            <Field label="场景">
              <Textarea
                value={draft.scenario}
                onChange={(event) => setDraft({ ...draft, scenario: event.target.value })}
              />
            </Field>
            <Field label="开场白">
              <Textarea
                value={draft.firstMessage}
                onChange={(event) =>
                  setDraft({ ...draft, firstMessage: event.target.value })
                }
              />
            </Field>
            <Field label="说话风格">
              <Input
                value={draft.speakingStyle}
                onChange={(event) =>
                  setDraft({ ...draft, speakingStyle: event.target.value })
                }
              />
            </Field>
            <Field label="背景">
              <Textarea
                value={draft.background}
                onChange={(event) =>
                  setDraft({ ...draft, background: event.target.value })
                }
              />
            </Field>
            <Field label="标签">
              <Input
                value={draft.tags.join('、')}
                onChange={(event) =>
                  setDraft({ ...draft, tags: splitList(event.target.value) })
                }
              />
            </Field>
            {status ? <p className="text-xs text-zinc-400">{status}</p> : null}
            <div className="flex gap-2">
              <Button variant="primary" onClick={save}>
                保存
              </Button>
              <Button
                onClick={() =>
                  setDraft({
                    ...draft,
                    id: nanoid(),
                    name: `${draft.name} 副本`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                <Copy size={15} />
                复制
              </Button>
              <Button variant="danger" onClick={() => deleteCharacter(draft.id)}>
                <Trash2 size={15} />
                删除
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
