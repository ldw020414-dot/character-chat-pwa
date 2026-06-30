export type ISODateString = string

export type ID = string

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

export type PromptTemplateCategory =
  | 'single_chat'
  | 'group_chat'
  | 'character_creation'
  | 'worldbook_generation'
  | 'chat_summary'

export type InsertionPosition = 'before_chat' | 'after_system' | 'before_user'

export type TriggerStrategy = 'keyword' | 'semantic_placeholder' | 'manual'

export type SessionMode = 'single' | 'group'

export type GroupTurnMode = 'manual' | 'round_robin' | 'auto' | 'directed'

export interface Timestamped {
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface CharacterCard extends Timestamped {
  id: ID
  name: string
  avatar?: string | undefined
  summary: string
  personality: string
  scenario: string
  firstMessage: string
  exampleDialogues: string[]
  speakingStyle: string
  background: string
  likes: string[]
  dislikes: string[]
  creatorNotes: string
  tags: string[]
  version: string
}

export interface CharacterVersion extends Timestamped {
  id: ID
  characterId: ID
  version: string
  snapshot: CharacterCard
}

export interface WorldBook extends Timestamped {
  id: ID
  name: string
  description: string
}

export interface WorldBookEntry extends Timestamped {
  id: ID
  worldBookId: ID
  title: string
  keywords: string[]
  secondaryKeywords: string[]
  content: string
  priority: number
  enabled: boolean
  insertionPosition: InsertionPosition
  triggerStrategy: TriggerStrategy
  tokenBudget: number
  pending: boolean
}

export interface UserPersona extends Timestamped {
  id: ID
  name: string
  content: string
  isDefault: boolean
}

export interface PromptTemplate extends Timestamped {
  id: ID
  name: string
  category: PromptTemplateCategory
  content: string
  isDefault: boolean
}

export interface ChatSession extends Timestamped {
  id: ID
  title: string
  mode: SessionMode
  characterId?: ID | undefined
  promptTemplateId?: ID | undefined
  userPersonaId?: ID | undefined
  modelConfigId?: ID | undefined
  archived: boolean
}

export interface ChatMessage extends Timestamped {
  id: ID
  sessionId: ID
  role: ChatRole
  content: string
  speakerId?: ID | undefined
  metadata: Record<string, unknown>
  tokenEstimate: number
}

export interface GroupChatMember extends Timestamped {
  id: ID
  sessionId: ID
  characterId: ID
  sortOrder: number
  muted: boolean
}

export interface ProviderParameters {
  temperature: number
  topP: number
  maxTokens: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface ApiProviderConfig extends Timestamped {
  id: ID
  provider: 'deepseek_proxy' | 'deepseek_direct_dev' | 'openai_compatible'
  name: string
  baseUrl: string
  model: string
  apiKeySecretRef?: string | undefined
  useProxy: boolean
  parameters: ProviderParameters
  enabled: boolean
  isDefault: boolean
}

export interface AppSettings extends Timestamped {
  id: 'app'
  theme: 'dark' | 'light'
  language: string
  debugPrompt: boolean
}

export interface GenerationLog extends Timestamped {
  id: ID
  sessionId?: ID | undefined
  providerId?: ID | undefined
  model: string
  promptTokenEstimate: number
  completionTokenEstimate: number
  triggeredWorldBookEntryIds: ID[]
  status: 'success' | 'error' | 'cancelled'
  errorMessage?: string | undefined
}

export interface AppBackup {
  version: 1
  exportedAt: ISODateString
  characters: CharacterCard[]
  worldBooks: WorldBook[]
  worldBookEntries: WorldBookEntry[]
  chatSessions: ChatSession[]
  chatMessages: ChatMessage[]
  groupChatMembers: GroupChatMember[]
  promptTemplates: PromptTemplate[]
  apiProviders: Omit<ApiProviderConfig, 'apiKeySecretRef'>[]
  userPersonas: UserPersona[]
  appSettings: AppSettings
}
