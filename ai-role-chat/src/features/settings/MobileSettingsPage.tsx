import { Download, Upload } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useMemo, useState } from 'react'

import { MobileHeader } from '@/components/layout/MobileShell'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import {
  exportBackupJson,
  exportSessionMarkdown,
  parseBackupJson,
} from '@/lib/export/exporters'
import { clearAccessSession } from '@/lib/auth/session'
import { buildPrompt } from '@/lib/prompt-engine'
import { shouldShowIosInstallHint } from '@/lib/pwa/install'
import { useAppStore } from '@/stores/app-store'
import type { PromptTemplate, PromptTemplateCategory } from '@/types/domain'

const categories: PromptTemplateCategory[] = [
  'single_chat',
  'group_chat',
  'character_creation',
  'worldbook_generation',
  'chat_summary',
]

const createTemplate = (): PromptTemplate => {
  const timestamp = new Date().toISOString()
  return {
    id: nanoid(),
    name: '新模板',
    category: 'single_chat',
    content: '你正在扮演 {{character_name}}。\n{{character_card}}\n{{world_book_entries}}',
    isDefault: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function MobileSettingsPage() {
  const state = useAppStore()
  const [provider, setProvider] = useState(state.apiProviders[0])
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate>(
    state.promptTemplates[0] ?? createTemplate(),
  )
  const [ioText, setIoText] = useState('')
  const [status, setStatus] = useState('')
  const showInstallHint = shouldShowIosInstallHint()

  const promptPreview = useMemo(() => {
    const character = state.characters[0]
    if (!character) return '请先创建角色。'
    return buildPrompt({
      template: selectedTemplate,
      character,
      userInput: '地下诊所的灯为什么灭了？',
      history: [],
      worldBookEntries: state.worldBookEntries,
      userPersona: state.userPersonas[0],
      language: state.appSettings.language,
      maxPromptTokens: 4000,
    }).preview
  }, [
    selectedTemplate,
    state.appSettings.language,
    state.characters,
    state.userPersonas,
    state.worldBookEntries,
  ])

  const saveProvider = () => {
    if (!provider) return
    state.upsertProvider(provider)
    setStatus('API 代理设置已保存。')
  }

  const exportAll = () => {
    setIoText(
      exportBackupJson({
        characters: state.characters,
        worldBooks: state.worldBooks,
        worldBookEntries: state.worldBookEntries,
        chatSessions: state.chatSessions,
        chatMessages: state.chatMessages,
        groupChatMembers: state.groupChatMembers,
        promptTemplates: state.promptTemplates,
        apiProviders: state.apiProviders,
        userPersonas: state.userPersonas,
        appSettings: state.appSettings,
      }),
    )
    setStatus('完整备份已生成。')
  }

  const restore = async () => {
    try {
      await state.replaceFromBackup(parseBackupJson(ioText))
      setStatus('备份已恢复。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '恢复失败。')
    }
  }

  const exportLatestMarkdown = () => {
    const session = state.chatSessions[0]
    if (!session) {
      setStatus('暂无会话可导出。')
      return
    }
    setIoText(
      exportSessionMarkdown(
        session,
        state.chatMessages.filter((message) => message.sessionId === session.id),
        (id) => state.characters.find((character) => character.id === id)?.name,
      ),
    )
    setStatus('已导出最近会话 Markdown。')
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <MobileHeader title="设置" subtitle="API 代理、Prompt、备份与 PWA" />
      <div className="ios-scroll min-h-0 flex-1 space-y-4 overflow-auto px-3 py-4">
        {showInstallHint ? (
          <div className="glass rounded-[28px] p-4">
            <div className="text-sm font-semibold text-emerald-200">添加到主屏幕</div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              在 Safari 底部点分享按钮，然后选择“添加到主屏幕”。从桌面打开后会使用独立窗口和安全区布局。
            </p>
          </div>
        ) : null}

        <div className="glass rounded-[28px] p-4">
          <div className="mb-3 text-sm font-semibold">DeepSeek API 代理</div>
          {provider ? (
            <div className="grid gap-3">
              <Field label="代理地址">
                <Input
                  value={provider.baseUrl}
                  onChange={(event) =>
                    setProvider({ ...provider, baseUrl: event.target.value })
                  }
                />
              </Field>
              <Field label="模型">
                <Input
                  value={provider.model}
                  onChange={(event) =>
                    setProvider({ ...provider, model: event.target.value })
                  }
                />
              </Field>
              <Field label="temperature">
                <Input
                  type="number"
                  step="0.1"
                  value={provider.parameters.temperature}
                  onChange={(event) =>
                    setProvider({
                      ...provider,
                      parameters: {
                        ...provider.parameters,
                        temperature: Number(event.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Button variant="primary" onClick={saveProvider}>
                保存代理设置
              </Button>
            </div>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            推荐默认 `/api/chat`。DeepSeek API Key 只能配置在 Cloudflare Worker 或
            Vercel 环境变量中，不会进入前端。
          </p>
        </div>

        <div className="glass rounded-[28px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">System Prompt 模板</div>
            <Button onClick={() => setSelectedTemplate(createTemplate())}>新建</Button>
          </div>
          <select
            className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950 px-3 text-sm"
            value={selectedTemplate.id}
            onChange={(event) => {
              const next = state.promptTemplates.find(
                (template) => template.id === event.target.value,
              )
              if (next) setSelectedTemplate(next)
            }}
          >
            {state.promptTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <Field label="名称">
            <Input
              value={selectedTemplate.name}
              onChange={(event) =>
                setSelectedTemplate({ ...selectedTemplate, name: event.target.value })
              }
            />
          </Field>
          <Field label="分类">
            <select
              className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950 px-3 text-sm"
              value={selectedTemplate.category}
              onChange={(event) =>
                setSelectedTemplate({
                  ...selectedTemplate,
                  category: event.target.value as PromptTemplateCategory,
                })
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <Field label="内容">
            <Textarea
              className="min-h-36 rounded-3xl border-white/10 bg-zinc-950/70 font-mono text-xs"
              value={selectedTemplate.content}
              onChange={(event) =>
                setSelectedTemplate({ ...selectedTemplate, content: event.target.value })
              }
            />
          </Field>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                if (
                  state.promptTemplates.some(
                    (template) => template.id === selectedTemplate.id,
                  )
                ) {
                  state.updatePromptTemplate(selectedTemplate.id, selectedTemplate)
                } else {
                  state.addPromptTemplate(selectedTemplate)
                }
                setStatus('Prompt 模板已保存。')
              }}
            >
              保存
            </Button>
            <Button onClick={() => state.setDefaultPromptTemplate(selectedTemplate.id)}>
              默认
            </Button>
          </div>
          <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-3xl bg-zinc-950/70 p-3 text-[11px] leading-5 text-zinc-400">
            {promptPreview}
          </pre>
        </div>

        <div className="glass rounded-[28px] p-4">
          <div className="mb-3 text-sm font-semibold">数据备份 / 恢复</div>
          <Textarea
            className="min-h-36 rounded-3xl border-white/10 bg-zinc-950/70 font-mono text-xs"
            value={ioText}
            onChange={(event) => setIoText(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={exportAll}>
              <Download size={15} />
              备份
            </Button>
            <Button onClick={exportLatestMarkdown}>会话 MD</Button>
            <Button onClick={() => void restore()}>
              <Upload size={15} />
              恢复
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm('确定清空全部本地数据？')) {
                  void state.clearAllData()
                }
              }}
            >
              清空
            </Button>
          </div>
        </div>

        <div className="glass rounded-[28px] p-4">
          <div className="mb-3 text-sm font-semibold">偏好</div>
          <Field label="回复语言">
            <Input
              value={state.appSettings.language}
              onChange={(event) =>
                state.updateSettings({ language: event.target.value })
              }
            />
          </Field>
          <label className="mt-3 flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={state.appSettings.debugPrompt}
              onChange={(event) =>
                state.updateSettings({ debugPrompt: event.target.checked })
              }
            />
            显示 Prompt 调试面板
          </label>
          <Button
            className="mt-3"
            onClick={() => {
              clearAccessSession()
              window.location.reload()
            }}
          >
            退出访问
          </Button>
        </div>

        {status ? <p className="px-2 pb-4 text-xs text-zinc-500">{status}</p> : null}
      </div>
    </section>
  )
}
