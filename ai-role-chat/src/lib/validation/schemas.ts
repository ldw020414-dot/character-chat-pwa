import { z } from 'zod'

export const characterCardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, '请输入角色名称'),
  avatar: z.string().optional(),
  summary: z.string().min(1, '请输入一句话简介'),
  personality: z.string().min(1, '请输入性格设定'),
  scenario: z.string().min(1, '请输入场景设定'),
  firstMessage: z.string().min(1, '请输入开场白'),
  exampleDialogues: z.array(z.string()),
  speakingStyle: z.string().min(1, '请输入说话风格'),
  background: z.string().min(1, '请输入背景故事'),
  likes: z.array(z.string()),
  dislikes: z.array(z.string()),
  creatorNotes: z.string(),
  tags: z.array(z.string()),
  version: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const worldBookEntrySchema = z.object({
  id: z.string().min(1),
  worldBookId: z.string().min(1),
  title: z.string().min(1, '请输入条目标题'),
  keywords: z.array(z.string().min(1)).min(1, '至少需要一个关键词'),
  secondaryKeywords: z.array(z.string()),
  content: z.string().min(1, '请输入世界书内容'),
  priority: z.number().int().min(0).max(100),
  enabled: z.boolean(),
  insertionPosition: z.enum(['before_chat', 'after_system', 'before_user']),
  triggerStrategy: z.enum(['keyword', 'semantic_placeholder', 'manual']),
  tokenBudget: z.number().int().min(50).max(4000),
  pending: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const promptTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, '请输入模板名称'),
  category: z.enum([
    'single_chat',
    'group_chat',
    'character_creation',
    'worldbook_generation',
    'chat_summary',
  ]),
  content: z.string().min(20, '模板内容过短'),
  isDefault: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const apiProviderConfigSchema = z.object({
  id: z.string().min(1),
  provider: z.enum(['deepseek_proxy', 'deepseek_direct_dev', 'openai_compatible']),
  name: z.string().min(1),
  baseUrl: z
    .string()
    .min(1)
    .refine(
      (value) => value.startsWith('/') || z.url().safeParse(value).success,
      '请输入有效的 API 地址或同源代理路径',
    ),
  model: z.string().min(1),
  apiKeySecretRef: z.string().optional(),
  useProxy: z.boolean(),
  parameters: z.object({
    temperature: z.number().min(0).max(2),
    topP: z.number().min(0).max(1),
    maxTokens: z.number().int().min(1).max(128000),
    frequencyPenalty: z.number().min(-2).max(2),
    presencePenalty: z.number().min(-2).max(2),
  }),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  speakerId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
  tokenEstimate: z.number().int().min(0),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const appBackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().min(1),
  characters: z.array(characterCardSchema),
  worldBooks: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
      createdAt: z.string().min(1),
      updatedAt: z.string().min(1),
    }),
  ),
  worldBookEntries: z.array(worldBookEntrySchema),
  chatSessions: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      mode: z.enum(['single', 'group']),
      characterId: z.string().optional(),
      promptTemplateId: z.string().optional(),
      userPersonaId: z.string().optional(),
      modelConfigId: z.string().optional(),
      archived: z.boolean(),
      createdAt: z.string().min(1),
      updatedAt: z.string().min(1),
    }),
  ),
  chatMessages: z.array(chatMessageSchema),
  groupChatMembers: z.array(
    z.object({
      id: z.string().min(1),
      sessionId: z.string().min(1),
      characterId: z.string().min(1),
      sortOrder: z.number().int(),
      muted: z.boolean(),
      createdAt: z.string().min(1),
      updatedAt: z.string().min(1),
    }),
  ),
  promptTemplates: z.array(promptTemplateSchema),
  apiProviders: z.array(apiProviderConfigSchema.omit({ apiKeySecretRef: true })),
  userPersonas: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      content: z.string(),
      isDefault: z.boolean(),
      createdAt: z.string().min(1),
      updatedAt: z.string().min(1),
    }),
  ),
  appSettings: z.object({
    id: z.literal('app'),
    theme: z.enum(['dark', 'light']),
    language: z.string().min(1),
    debugPrompt: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }),
})

export type CharacterCardInput = z.infer<typeof characterCardSchema>
