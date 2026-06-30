import { Save } from 'lucide-react'
import { useState } from 'react'

import { MobileHeader } from '@/components/layout/MobileShell'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import {
  buildCharacterDraftFromWizard,
  nextCharacterWizardQuestions,
  type WizardTurn,
} from './character-wizard-service'
import { characterCardSchema } from '@/lib/validation/schemas'
import { useAppStore } from '@/stores/app-store'

export function MobileCreatorPage() {
  const addCharacter = useAppStore((state) => state.addCharacter)
  const [idea, setIdea] = useState('帮我创建一个冷淡但很保护人的赛博医生角色。')
  const [answer, setAnswer] = useState('')
  const [turns, setTurns] = useState<WizardTurn[]>([])
  const [status, setStatus] = useState('每轮只问 1 到 3 个问题。')
  const questions = nextCharacterWizardQuestions(idea, turns)
  const draft = buildCharacterDraftFromWizard(idea, turns)

  const addAnswer = () => {
    if (!answer.trim()) return
    setTurns((current) => [...current, { role: 'user', content: answer.trim() }])
    setAnswer('')
  }

  const save = () => {
    const parsed = characterCardSchema.safeParse(draft)
    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message ?? '角色卡校验失败')
      return
    }
    addCharacter(parsed.data)
    setStatus('角色草稿已保存。')
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <MobileHeader title="创建" subtitle="问答式角色卡生成" />
      <div className="ios-scroll min-h-0 flex-1 space-y-4 overflow-auto px-3 py-4">
        <div className="glass rounded-[28px] p-4">
          <Field label="角色灵感">
            <Textarea
              className="rounded-3xl border-white/10 bg-zinc-950/70"
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
            />
          </Field>
        </div>

        <div className="glass rounded-[28px] p-4">
          <div className="mb-3 text-sm font-medium text-emerald-200">AI 正在追问</div>
          <div className="space-y-2 text-sm leading-6 text-zinc-300">
            {questions.length > 0 ? (
              questions.map((question) => (
                <div key={question} className="rounded-2xl bg-white/8 p-3">
                  {question}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white/8 p-3">
                信息已足够，可以保存结构化角色卡。
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-[28px] p-4">
          <Field label="你的回答">
            <Textarea
              className="rounded-3xl border-white/10 bg-zinc-950/70"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="像聊天一样回答即可。"
            />
          </Field>
          <div className="mt-3 flex gap-2">
            <Button onClick={addAnswer}>继续问答</Button>
            <Button variant="primary" onClick={save}>
              <Save size={15} />
              保存
            </Button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">{status}</p>
        </div>

        <div className="glass rounded-[28px] p-4">
          <div className="mb-2 text-sm font-medium">结构化预览</div>
          <pre className="whitespace-pre-wrap text-xs leading-5 text-zinc-300">
            {JSON.stringify(draft, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  )
}
